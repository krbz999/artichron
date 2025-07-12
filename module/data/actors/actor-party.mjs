import ActorSystemModel from "./system-model.mjs";

const { NumberField, SchemaField, TypedObjectField } = foundry.data.fields;

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
    });
  }

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
