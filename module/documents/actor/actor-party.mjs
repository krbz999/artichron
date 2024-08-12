import ActorSystemModel from "./system-model.mjs";

const {ArrayField, ForeignDocumentField, SchemaField, SetField} = foundry.data.fields;

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

  /* -------------------------------------------------- */
  /*   Preparation methods                              */
  /* -------------------------------------------------- */

  /** @override */
  prepareBaseData() {
    // Assign an 'id' property to the members set for convenience.
    const ids = new Set();
    this.members = this.members.filter((member) => {
      if (!member.actor || (member.actor.type === "party") || ids.has(member.actor.id)) return false;
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
    if (actor.type === "party") throw new Error("Cannot add a party to a party!");
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
