import ActorSystemModel from "./system-model.mjs";

/**
 * @typedef {object} PartyMetadata
 * @property {Set<string>} allowedActorTypes      The actor types allowed to be added to a party actor.
 */

const {ForeignDocumentField, SchemaField, SetField} = foundry.data.fields;

export default class PartyData extends ActorSystemModel {
  /** @override */
  static defineSchema() {
    return {
      members: new SetField(new SchemaField({
        actor: new ForeignDocumentField(foundry.documents.BaseActor)
      }))
    };
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * Party actor metadata.
   * @type {PartyMetadata}
   */
  static metadata = Object.freeze({
    allowedActorTypes: new Set(["hero", "monster"])
  });

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
}
