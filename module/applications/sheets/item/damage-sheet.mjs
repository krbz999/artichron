import PseudoDocumentSheet from "../../api/pseudo-document-sheet.mjs";

export default class DamageSheet extends PseudoDocumentSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    window: {
      icon: "fa-solid fa-burst",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    damage: {
      template: "systems/artichron/templates/sheets/item/damage-sheet/damage.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {};

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch (partId) {
      case "damage":
        return this.#preparePartContextDamage(context, options);
    }
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async #preparePartContextDamage(context, options) {
    context.number = this._prepareField("number");
    context.denomination = this._prepareField("denomination");
    context.type = Object.assign(this._prepareField("type"), { options: artichron.config.DAMAGE_TYPES.optgroups });
    context.options = this._prepareField("options");
    return context;
  }
}
