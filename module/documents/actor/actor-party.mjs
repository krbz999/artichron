import ActorSystemModel from "./system-model.mjs";
import Clock from "../data/clocks.mjs";
import CollectionField from "../data/fields/collection-field.mjs";
import PartyDistributionDialog from "../../applications/actor/party-distribution-dialog.mjs";

const {
  ForeignDocumentField, NumberField, SchemaField, SetField,
} = foundry.data.fields;

export default class PartyData extends ActorSystemModel {
  /**
   * Metadata for this data model.
   * @type {import("../../helpers/types.mjs").ActorSystemModelMetadata}
   */
  static metadata = Object.freeze({
    type: "party",
    allowedActorTypes: new Set(["hero", "monster"]),
  });

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    const schema = super.defineSchema();

    schema.members = new SetField(new SchemaField({
      actor: new ForeignDocumentField(foundry.documents.BaseActor),
    }));

    schema.clocks = new CollectionField(Clock);

    schema.points = new SchemaField({
      value: new NumberField({ min: 0, integer: true }),
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

  /** @override */
  prepareBaseData() {
    // Assign an 'id' property to the members set for convenience.
    const ids = new Set();
    this.members = this.members.filter((member) => {
      if (!PartyData.metadata.allowedActorTypes.has(member.actor?.type) || ids.has(member.actor.id)) return false;
      ids.add(member.actor.id);
      return true;
    });
    Object.defineProperty(this.members, "ids", {
      value: ids,
      enumerable: false,
      writable: false,
    });
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
    if (actor.pack) throw new Error("Added member cannot be in a compendium!");
    if (this.members.ids.has(actor.id)) return;
    const members = this.toObject().members;
    members.push({ actor: actor.id });
    return this.parent.update({ "system.members": members });
  }

  /* -------------------------------------------------- */

  /**
   * Remove a member from the party.
   * @param {ActorArtichron} actor          The actor to remove.
   * @returns {Promise<ActorArtichron>}     A promise that resolves to the updated party actor.
   */
  async removeMember(actor) {
    if (!this.members.ids.has(actor.id)) return;
    const members = [];
    for (const member of this.toObject().members) {
      if (!this.members.ids.has(member.actor) || (member.actor === actor.id)) continue;
      members.push(member);
    }
    return this.parent.update({ "system.members": members });
  }

  /* -------------------------------------------------- */

  /**
   * Place the members of this party on the map.
   * @returns {TokenDocumentArtichron[]}
   */
  async placeMembers() {
    const tokens = Array.from(this.members).map(m => m.actor.prototypeToken);
    const placements = await artichron.canvas.TokenPlacement.place({ tokens: tokens });

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
      created.map((token, i) => token.move([movements[i]], options));
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

  /**
   * Prompt a dialog for a GM user to distribute progression points to the members of this party.
   * @returns {Promise}
   */
  async distributePointsDialog() {
    return this.constructor.distributePointsDialog(this.parent);
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

    party ??= game.settings.get("artichron", "primaryParty").actor;
    if (!party) throw new Error("No primary party has been assigned!");

    const configuration = await PartyDistributionDialog.create({ party, type: "currency" });
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

    Actor.implementation.updateDocuments(updates);
  }

  /* -------------------------------------------------- */

  /**
   * Prompt a dialog for a GM user to distribute progression points to the members of a party.
   * @param {ActorArtichron} [party]      The party whose members to distribute to.
   * @returns {Promise}
   */
  static async distributePointsDialog(party) {
    if (!game.user.isGM) throw new Error("Only a GM can distribute to the party!");

    party ??= game.settings.get("artichron", "primaryParty").actor;
    if (!party) throw new Error("No primary party has been assigned!");

    const configuration = await PartyDistributionDialog.create({ party, type: "points" });
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
      const value = actor.system.progression.points.total + amount;
      updates.push({ _id: actor.id, "system.progression.points.total": value });
    }
    updates.push({ _id: party.id, "system.points.value": party.system.points.value - amount * actors.length });

    for (const actor of actors) {
      const content = game.i18n.format("ARTICHRON.PartyDistributionDialog.ContentPoints", {
        name: actor.name, amount: amount,
      });
      ChatMessage.implementation.create({
        whisper: game.users.filter(u => actor.testUserPermission(u, "OWNER")).map(u => u.id),
        content: `<p>${content}</p>`,
        speaker: ChatMessage.implementation.getSpeaker({ actor: party }),
      });
    }

    Actor.implementation.updateDocuments(updates);
  }
}
