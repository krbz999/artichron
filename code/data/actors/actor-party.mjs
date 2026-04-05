import ActorSystemModel from "./system-model.mjs";

const { NumberField, SchemaField, SetField, StringField, TypedObjectField } = foundry.data.fields;

export default class PartyData extends ActorSystemModel {
  /** @type {import("../../_types").PartyActorMetadata} */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      allowedActorTypes: new Set(["hero", "monster"]),
      allowedItemTypes: new Set(["ammo", "armor", "elixir", "part", "spell"]),
      embedded: {
        Clock: "system.clocks",
      },
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      clocks: new artichron.data.fields.CollectionField(artichron.data.pseudoDocuments.clocks.BaseClock),
      currency: new SchemaField({
        funds: new NumberField({ integer: true, min: 0 }),
      }),
      members: new TypedObjectField(new SchemaField({}), {
        validateKey: key => foundry.data.validators.isValidId(key),
      }),
      points: new SchemaField({
        value: new NumberField({ min: 0, integer: true }),
      }),
      recovery: new SchemaField({
        tasks: new TypedObjectField(new SchemaField({
          assigned: new SetField(new StringField()),
          label: new StringField({ required: true, blank: false }),
          skills: new SchemaField({
            primary: new StringField({ required: true, initial: "agility", choices: artichron.config.SKILLS }),
            secondary: new StringField({ required: true, blank: true, initial: "", choices: artichron.config.SKILLS }),
          }),
          threshold: new NumberField({ integer: true, nullable: false, min: 1, initial: 1 }),
        })),
      }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ACTOR.PARTY",
  ];

  /* -------------------------------------------------- */
  /*   Preparation methods                              */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareBaseData() {
    super.prepareBaseData();
    this.members = Object.entries(this.members).reduce((acc, [id, obj]) => {
      const actor = game.actors.get(id);
      const allowed = actor && (actor !== this.parent) && this.constructor.metadata.allowedActorTypes.has(actor.type);
      if (allowed) acc.set(id, { ...obj, actor });
      return acc;
    }, new foundry.utils.Collection());
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Add a new member.
   * @param {ActorArtichron} actor        The actor to add.
   * @returns {Promise<ActorArtichron>}   A promise that resolves to the updated party actor.
   */
  async addMember(actor) {
    if (!PartyData.metadata.allowedActorTypes.has(actor.type)) throw new Error(`Cannot add a ${actor.type} to a party!`);
    if (actor.inCompendium) throw new Error("Added member cannot be in a compendium!");
    if (this.members.has(actor.id)) return;
    if (!actor.prototypeToken.actorLink) throw new Error("Added member cannot be unlinked actor!");

    const ids = this.members.map(member => member.actor.id).concat(actor.id);
    const members = Object.entries(this._source.members).reduce((acc, [id, source]) => {
      if (ids.includes(id)) acc[id] = source;
      return acc;
    }, {});
    members[actor.id] = {};

    return this.parent.update({ "system.==members": members });
  }

  /* -------------------------------------------------- */

  /**
   * Remove a member from the party.
   * @param {ActorArtichron} actor        The actor to remove.
   * @returns {Promise<ActorArtichron>}   A promise that resolves to the updated party actor.
   */
  async removeMember(actor) {
    if (!this.members.has(actor.id)) return;

    const ids = Array.from(this.members.keys()).filter(id => id !== actor.id);
    const members = Object.entries(this._source.members).reduce((acc, [id, source]) => {
      if (ids.includes(id)) acc[id] = source;
      return acc;
    }, {});

    return this.parent.update({ "system.==members": members });
  }

  /* -------------------------------------------------- */

  /**
   * Place the members of this party on the map.
   * @returns {TokenDocumentArtichron[]}
   */
  async placeMembers() {
    const tokens = this.members.map(member => member.actor.prototypeToken);
    const placements = await artichron.canvas.placement.TokenPlacement.place({ tokens: tokens });

    const origin = this.parent.isToken ? this.parent.token?.object : this.parent.getActiveTokens()[0];

    const tokenData = [];
    const movements = [];
    for (const p of placements) {
      const { x, y, rotation } = p;
      const id = foundry.utils.randomID();
      movements.push({ x, y, rotation, _id: id });
      const token = await p.prototypeToken.parent.getTokenDocument(origin ? {
        x: origin.document.x, y: origin.document.y,
      } : { x, y, rotation });
      tokenData.push(foundry.utils.mergeObject(token.toObject(), { _id: id }));
    }
    const created = await canvas.scene.createEmbeddedDocuments("Token", tokenData, { keepId: true });
    if (origin) {
      await new Promise(r => setTimeout(r, 100));
      const options = { autoRotate: true, showRuler: true };
      created.map((token, i) => token.move([{ ...movements[i], action: "walk" }], { ...options }));
    }

    return created;
  }

  /* -------------------------------------------------- */

  /**
   * Prompt a dialog for a GM user to distribute currency to the members of this party.
   * @param {"currency"|"points"} [type]    What to distribute.
   * @returns {Promise}
   */
  async distribute(type = "currency") {
    return this.constructor.distribute(this.parent, type);
  }

  /* -------------------------------------------------- */
  /*   Recovery                                         */
  /* -------------------------------------------------- */

  /**
   * Initiate recovery phase.
   * @returns {Promise<void>}
   */
  async initiateRecovery() {
    if (!game.user.isActiveGM) throw new Error("Only the active GM can initiate a recovery phase.");

    const party = this.parent;
    const update = await artichron.applications.apps.actor.RecoveryPhaseConfig.create({ party });
    if (!update) return;
    await party.update({ "system.recovery.==tasks": update, "flags.artichron.recovering": true });

    const Cls = foundry.utils.getDocumentClass("ChatMessage");
    await Cls.create({ type: "recovery", speaker: Cls.getSpeaker({ actor: party }), "flags.core.canPopout": true });
  }

  /* -------------------------------------------------- */

  /**
   * Finalize the recovery phase by rendering the application, waiting for all participants to
   * assign themselves, then performing any rolls and updates.
   * @param {object} [options]
   * @param {foundry.documents.ChatMessage} [options.chatMessage]
   * @returns {Promise<void>}
   */
  async finalizeRecovery({ chatMessage = null } = {}) {
    const party = this.parent;

    const configuration = await artichron.applications.apps.actor.RecoveryPhase.create({ party });
    if (!configuration) return null;

    if (chatMessage) {
      const update = {
        configured: true,
        results: {},
      };
      for (const [taskId, task] of Object.entries(party.system.recovery.tasks)) {
        const result = {
          label: task.label,
          threshold: task.threshold,
          rolled: {},
        };
        update.results[taskId] = result;
      }
      await chatMessage.setFlag("artichron", "recovery", update);
    }

    await party.update({ "flags.artichron.recovering": false });
  }

  /* -------------------------------------------------- */

  /**
   * Assign a party member to a task.
   * @param {foundry.documents.Actor} actor         The actor to assign.
   * @param {object} options
   * @param {string} options.task                   The task id.
   * @param {boolean} [options.unassign]            Rather than assign, unassign an assigned actor.
   * @returns {Promise<foundry.documents.Actor>}    A promise that resolves to the updated party actor.
   */
  async assignTask(actor, { task, unassign = false }) {
    if (!(this.members.has(actor.id))) return;
    let assigned;
    if (unassign) assigned = [...this.recovery.tasks[task].assigned].filter(id => id !== actor.id);
    else assigned = [...this.recovery.tasks[task].assigned, actor.id];
    return this.parent.update({ [`system.recovery.tasks.${task}.assigned`]: assigned });
  }

  /* -------------------------------------------------- */

  /**
   * Assign a party member to a task.
   * @param {foundry.documents.Actor} actor         The actor to assign.
   * @param {object} options
   * @param {string} options.task                   The task id.
   * @param {boolean} [options.unassign]            Rather than assign, unassign an assigned actor.
   */
  static async assignTask(actor, { task, unassign = false }) {
    const party = game.actors.party;

    if (!party) {
      return void ui.notifications.warn("ARTICHRON.RECOVERY.noPrimaryParty", { localize: true });
    }

    const user = game.users.getDesignatedUser(user => user.active && party.canUserModify(user, "update"));
    if (!user) {
      return void ui.notifications.warn("ARTICHRON.RECOVERY.noActiveUser", { localize: true });
    }

    const config = { actorId: actor.id, task, unassign };
    return user.query("recovery", { type: "assign", config }, { timeout: 10_000 });
  }

  /* -------------------------------------------------- */

  /**
   * Query method to delegate handling.
   * @type {Function}
   */
  static _query = ({ type, config = {} }) => {
    const party = game.actors.party;
    const actor = game.actors.get(config.actorId);

    switch (type) {
      case "assign": party.system.assignTask(actor, config); break;
    }
  };

  /* -------------------------------------------------- */
  /*   Static methods                                   */
  /* -------------------------------------------------- */

  /**
   * Prompt a dialog for a GM user to distribute currency or points to the members of a party.
   * @param {ActorArtichron} [party]        The party whose members to distribute to.
   * @param {"currency"|"points"} [type]    What to distribute.
   * @returns {Promise}
   */
  static async distribute(party, type = "currency") {
    if (!game.user.isGM) throw new Error("Only a GM can distribute to the party!");

    party ??= game.actors.party;
    if (!party) throw new Error("No primary party has been assigned!");

    const configuration = await artichron.applications.apps.actor.PartyDistributionDialog.create({ party, type });
    if (!configuration) return;

    let amount = 0;
    const Cls = foundry.utils.getDocumentClass("ChatMessage");
    const updates = [];
    const messageData = [];
    for (const [actorId, { value } ] of Object.entries(configuration.recipients)) {
      amount += value;
      const actor = game.actors.get(actorId);
      const path = type === "currency" ? "system.currency.funds" : "system.progression.points.value";
      updates.push({ _id: actorId, [path]: foundry.utils.getProperty(actor, path) + value });

      const content = game.i18n.format(
        type === "currency" ? "ARTICHRON.DISTRIBUTE.MESSAGE.content" : "ARTICHRON.DISTRIBUTE.MESSAGE.points",
        { name: actor.name, amount: value });
      if (value) messageData.push({
        whisper: game.users.filter(u => actor.testUserPermission(u, "OWNER")).map(u => u.id),
        content: `<p>${content}</p>`,
        speaker: Cls.getSpeaker({ actor: party }),
      });
    }

    // Party update.
    const path = type === "currency" ? "system.currency.funds" : "system.points.value";
    updates.push({ _id: party.id, [path]: foundry.utils.getProperty(party, path) - amount });

    await Cls.createDocuments(messageData);
    return foundry.utils.getDocumentClass("Actor").updateDocuments(updates);
  }
}
