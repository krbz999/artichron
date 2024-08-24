import ActorSystemModel from "./system-model.mjs";

/**
 * @typedef {object} PartyMetadata
 * @property {Set<string>} allowedActorTypes      The actor types allowed to be added to a party actor.
 */

const {
  ArrayField, ColorField, ForeignDocumentField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class PartyData extends ActorSystemModel {
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

    return schema;
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
  /*   Static methods                                   */
  /* -------------------------------------------------- */

  /**
   * Prompt a dialog for a GM user to award the members of the primary party with currency.
   * @returns {Promise}
   */
  static async awardCurrencyDialog() {
    if (!game.user.isGM) throw new Error("Only a GM can grant the party awards!");

    const party = game.settings.get("artichron", "primaryParty").actor;
    if (!party) throw new Error("No primary party has been assigned!");

    const amount = new foundry.data.fields.NumberField({
      nullable: false,
      min: 1,
      step: 1,
      label: "ARTICHRON.AwardDialog.amount.label",
      hint: "ARTICHRON.AwardDialog.amount.hintCurrency"
    }).toFormGroup({localize: true}, {name: "amount", value: 1}).outerHTML;

    const choices = party.system.members.reduce((acc, m) => {
      const a = m.actor;
      acc[a.id] = a.name;
      return acc;
    }, {});
    const targets = new foundry.data.fields.SetField(new foundry.data.fields.StringField({
      choices: choices
    }), {
      label: "ARTICHRON.AwardDialog.targets.label",
      hint: "ARTICHRON.AwardDialog.targets.hint"
    }).toFormGroup({localize: true}, {name: "targets", value: Object.keys(choices), type: "checkboxes"}).outerHTML;

    return foundry.applications.api.DialogV2.prompt({
      content: `<fieldset>${amount}${targets}</fieldset>`,
      rejectClose: false,
      window: {
        title: "ARTICHRON.AwardDialog.TitleCurrency",
        icon: "fa-solid fa-medal"
      },
      position: {width: 400},
      ok: {
        callback: (event, button, html) => {
          const {amount, targets} = new FormDataExtended(button.form).object;
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

          for (const actor of actors) {
            const whisper = game.users.filter(u => actor.testUserPermission(u, "OWNER")).map(u => u.id);
            const content = game.i18n.format("ARTICHRON.AwardDialog.ContentCurrency", {name: actor.name, amount: amount});
            ChatMessage.implementation.create({whisper, content: `<p>${content}</p>`});
          }

          Actor.updateDocuments(updates);
        }
      }
    });
  }

  /* -------------------------------------------------- */

  /**
   * Prompt a dialog for a GM user to award the members of the primary party with skill points.
   * @returns {Promise}
   */
  static async awardPointsDialog() {
    if (!game.user.isGM) throw new Error("Only a GM can grant the party awards!");

    const party = game.settings.get("artichron", "primaryParty").actor;
    if (!party) throw new Error("No primary party has been assigned!");

    const amount = new foundry.data.fields.NumberField({
      nullable: false,
      min: 1,
      step: 1,
      label: "ARTICHRON.AwardDialog.amount.label",
      hint: "ARTICHRON.AwardDialog.amount.hintPoints"
    }).toFormGroup({localize: true}, {name: "amount", value: 1}).outerHTML;

    const choices = party.system.members.reduce((acc, m) => {
      const a = m.actor;
      if (a.type === "hero") acc[a.id] = a.name;
      return acc;
    }, {});
    const targets = new foundry.data.fields.SetField(new foundry.data.fields.StringField({
      choices: choices
    }), {
      label: "ARTICHRON.AwardDialog.targets.label",
      hint: "ARTICHRON.AwardDialog.targets.hint"
    }).toFormGroup({localize: true}, {name: "targets", value: Object.keys(choices), type: "checkboxes"}).outerHTML;

    return foundry.applications.api.DialogV2.prompt({
      content: `<fieldset>${amount}${targets}</fieldset>`,
      rejectClose: false,
      window: {
        title: "ARTICHRON.AwardDialog.TitlePoints",
        icon: "fa-solid fa-medal"
      },
      position: {width: 400},
      ok: {
        callback: (event, button, html) => {
          const {amount, targets} = new FormDataExtended(button.form).object;
          const actors = Array.from(targets).map(id => game.actors.get(id));

          if (!actors.length) {
            throw new Error("You must select at least one actor!");
          }

          if (amount <= 0) {
            throw new Error("You can only award a positive amount!");
          }

          const updates = [];
          for (const actor of actors) {
            updates.push({
              _id: actor.id,
              "system.progression.points.total": actor.system.progression.points.total + amount
            });
          }

          for (const actor of actors) {
            const whisper = game.users.filter(u => actor.testUserPermission(u, "OWNER")).map(u => u.id);
            const content = game.i18n.format("ARTICHRON.AwardDialog.ContentPoints", {name: actor.name, amount: amount});
            ChatMessage.implementation.create({whisper, content: `<p>${content}</p>`});
          }

          Actor.updateDocuments(updates);
        }
      }
    });
  }
}
