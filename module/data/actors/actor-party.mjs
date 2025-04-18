import ActorSystemModel from "./system-model.mjs";

const { NumberField, SchemaField, TypedObjectField } = foundry.data.fields;

export default class PartyData extends ActorSystemModel {
  /**
   * Metadata for this data model.
   * @type {import("../../helpers/types.mjs").ActorSystemModelMetadata}
   */
  static get metadata() {
    return {
      type: "party",
      allowedActorTypes: new Set(["hero", "monster"]),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    const schema = super.defineSchema();

    Object.assign(schema, {
      members: new TypedObjectField(new SchemaField({}), {
        validateKey: key => foundry.data.validators.isValidId(key),
      }),
      clocks: new artichron.data.fields.CollectionField(artichron.data.pseudoDocuments.clocks.BaseClock),
      points: new SchemaField({
        value: new NumberField({ min: 0, integer: true }),
      }),
    });

    schema.currency.fields.award = new NumberField({ integer: true, min: 0, initial: 0, nullable: false });

    return schema;
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

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
   * @param {ActorArtichron} actor          The actor to add.
   * @returns {Promise<ActorArtichron>}     A promise that resolves to the updated party actor.
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
   * @param {ActorArtichron} actor          The actor to remove.
   * @returns {Promise<ActorArtichron>}     A promise that resolves to the updated party actor.
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
      const options = { autoRotate: true, animation: { duration: 1000, easing: "easeInOutCosine" } };
      created.map((token, i) => token.move([movements[i]], { ...options }));
    }

    return created;
  }

  /* -------------------------------------------------- */

  /**
   * Prompt a dialog for a GM user to distribute currency to the members of this party.
   * @returns {Promise}
   */
  async distributeCurrencyDialog() {
    return this.constructor.distributeCurrencyDialog(this.parent);
  }

  /* -------------------------------------------------- */
  /*   Static methods                                   */
  /* -------------------------------------------------- */

  /**
   * Prompt a dialog for a GM user to distribute currency to the members of a party.
   * @param {ActorArtichron} [party]      The party whose members to distribute to.
   * @returns {Promise}
   */
  static async distributeCurrencyDialog(party) {
    if (!game.user.isGM) throw new Error("Only a GM can distribute to the party!");

    party ??= game.actors.party;
    if (!party) throw new Error("No primary party has been assigned!");

    const configuration = await artichron.applications.apps.actor.PartyDistributionDialog.create({
      party, type: "currency",
    });
    if (!configuration) return;
    const { amount, targets } = configuration;
    const actors = Array.from(targets).map(id => game.actors.get(id));

    if (!actors.length) {
      throw new Error("You must select at least one actor!");
    }

    if (amount <= 0) {
      throw new Error("You can only distribute a positive amount!");
    }

    const updates = [];
    for (const actor of actors) {
      if (actor.id === party.id) continue;
      const path = "system.currency.funds";
      const value = foundry.utils.getProperty(actor, path);
      updates.push({ _id: actor.id, [path]: value + amount });
    }

    const partyUpdate = { _id: party.id, "system.currency.award": party.system.currency.award - amount * actors.length };
    if (actors.includes(party)) partyUpdate["system.currency.funds"] = party.system.currency.funds + amount;
    updates.push(partyUpdate);

    for (const actor of actors) {
      const content = game.i18n.format("ARTICHRON.PartyDistributionDialog.ContentCurrency", {
        name: actor.name, amount: amount,
      });
      ChatMessage.implementation.create({
        whisper: game.users.filter(u => actor.testUserPermission(u, "OWNER")).map(u => u.id),
        content: `<p>${content}</p>`,
        speaker: ChatMessage.implementation.getSpeaker({ actor: party }),
      });
    }

    foundry.utils.getDocumentClass("Actor").updateDocuments(updates);
  }
}
