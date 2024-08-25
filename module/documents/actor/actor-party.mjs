import ActorSystemModel from "./system-model.mjs";
import AwardDialog from "../../applications/actor/award-dialog.mjs";

const {
  ArrayField, ColorField, ForeignDocumentField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class PartyData extends ActorSystemModel {
  /**
   * Metadata for this data model.
   * @type {import("../../helpers/types.mjs").ActorSystemModelMetadata}
   */
  static metadata = Object.freeze({
    type: "party",
    allowedActorTypes: new Set(["hero", "monster"])
  });

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    const schema = super.defineSchema();

    schema.members = new SetField(new SchemaField({
      actor: new ForeignDocumentField(foundry.documents.BaseActor)
    }));

    schema.clocks = new ArrayField(new SchemaField({
      name: new StringField({
        required: true,
        initial: () => game.i18n.localize("ARTICHRON.ActorProperty.FIELDS.clocks.name.initial"),
        label: "ARTICHRON.ActorProperty.FIELDS.clocks.name.label"
      }),
      value: new NumberField({
        min: 0, step: 1, initial: 0,
        label: "ARTICHRON.ActorProperty.FIELDS.clocks.value.label"
      }),
      max: new NumberField({
        min: 1, step: 1, initial: 8, nullable: false,
        label: "ARTICHRON.ActorProperty.FIELDS.clocks.max.label"
      }),
      color: new ColorField({
        required: true, nullable: false, initial: "#0000ff",
        label: "ARTICHRON.ActorProperty.FIELDS.clocks.color.label"
      })
    }));

    schema.points = new SchemaField({
      value: new NumberField({min: 0, integer: true})
    });

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
      writable: false
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
    members.push({actor: actor.id});
    return this.parent.update({"system.members": members});
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
    return this.parent.update({"system.members": members});
  }

  /* -------------------------------------------------- */

  /**
   * Place the members of this party on the map.
   * @returns {TokenDocumentArtichron[]}
   */
  async placeMembers() {
    const tokens = Array.from(this.members).map(m => m.actor.prototypeToken);
    const placements = await artichron.helpers.TokenPlacement.place({tokens: tokens});

    const origin = this.parent.isToken ? this.parent.token?.object : this.parent.getActiveTokens()[0];

    const tokenData = [];
    const movements = [];
    for (const p of placements) {
      const {x, y, rotation} = p;
      const id = foundry.utils.randomID();
      movements.push({x, y, rotation, alpha: 1, _id: id});
      const token = await p.prototypeToken.parent.getTokenDocument(origin ? {
        x: origin.document.x, y: origin.document.y, alpha: 0
      } : {x, y, rotation});
      tokenData.push(foundry.utils.mergeObject(token.toObject(), {_id: id}));
    }
    const created = await canvas.scene.createEmbeddedDocuments("Token", tokenData, {keepId: true});

    if (origin) {
      await new Promise(r => setTimeout(r, 100));
      await canvas.scene.updateEmbeddedDocuments("Token", movements, {
        animation: {duration: 1000, easing: "easeInOutCosine"}
      });
    }

    return created;
  }

  /* -------------------------------------------------- */

  /**
   * Prompt a dialog for a GM user to award the members of this party with currency.
   * @returns {Promise}
   */
  async awardCurrencyDialog() {
    return this.constructor.awardCurrencyDialog(this.parent);
  }

  /* -------------------------------------------------- */

  /**
   * Prompt a dialog for a GM user to award the members of this party with progression points.
   * @returns {Promise}
   */
  async awardPointsDialog() {
    return this.constructor.awardPointsDialog(this.parent);
  }

  /* -------------------------------------------------- */
  /*   Static methods                                   */
  /* -------------------------------------------------- */

  /**
   * Prompt a dialog for a GM user to award the members of a party with currency.
   * @param {ActorArtichron} [party]      The party whose members to award.
   * @returns {Promise}
   */
  static async awardCurrencyDialog(party) {
    if (!game.user.isGM) throw new Error("Only a GM can grant the party awards!");

    party ??= game.settings.get("artichron", "primaryParty").actor;
    if (!party) throw new Error("No primary party has been assigned!");

    const configuration = await AwardDialog.create(party, "currency");
    if (!configuration) return;
    const {amount, targets} = configuration.object;
    const actors = Array.from(targets).map(id => game.actors.get(id));

    if (!actors.length) {
      throw new Error("You must select at least one actor!");
    }

    if (amount <= 0) {
      throw new Error("You can only award a positive amount!");
    }

    const updates = [];
    for (const actor of actors) {
      updates.push({_id: actor.id, "system.currency.chron": actor.system.currency.chron + amount});
    }
    updates.push({_id: party.id, "system.currency.chron": party.system.currency.chron - amount * actors.length});

    for (const actor of actors) {
      const whisper = game.users.filter(u => actor.testUserPermission(u, "OWNER")).map(u => u.id);
      const content = game.i18n.format("ARTICHRON.AwardDialog.ContentCurrency", {name: actor.name, amount: amount});
      ChatMessage.implementation.create({whisper, content: `<p>${content}</p>`});
    }

    Actor.updateDocuments(updates);
  }

  /* -------------------------------------------------- */

  /**
   * Prompt a dialog for a GM user to award the members of a party with progression points.
   * @param {ActorArtichron} [party]      The party whose members to award.
   * @returns {Promise}
   */
  static async awardPointsDialog(party) {
    if (!game.user.isGM) throw new Error("Only a GM can grant the party awards!");

    party ??= game.settings.get("artichron", "primaryParty").actor;
    if (!party) throw new Error("No primary party has been assigned!");

    const configuration = await AwardDialog.create(party, "points");
    if (!configuration) return;
    const {amount, targets} = configuration.object;
    const actors = Array.from(targets).map(id => game.actors.get(id));

    if (!actors.length) {
      throw new Error("You must select at least one actor!");
    }

    if (amount <= 0) {
      throw new Error("You can only award a positive amount!");
    }

    const updates = [];
    for (const actor of actors) {
      const value = actor.system.progression.points.total + amount;
      updates.push({_id: actor.id, "system.progression.points.total": value});
    }
    updates.push({_id: party.id, "system.points.value": party.system.points.value - amount * actors.length});

    for (const actor of actors) {
      const whisper = game.users.filter(u => actor.testUserPermission(u, "OWNER")).map(u => u.id);
      const content = game.i18n.format("ARTICHRON.AwardDialog.ContentPoints", {name: actor.name, amount: amount});
      ChatMessage.implementation.create({whisper, content: `<p>${content}</p>`});
    }

    Actor.updateDocuments(updates);
  }
}
