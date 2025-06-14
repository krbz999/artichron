import PseudoDocumentSheet from "../../api/pseudo-document-sheet.mjs";

export default class DamageSheet extends PseudoDocumentSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    position: {
      width: 400,
    },
    window: {
      icon: "fa-solid fa-burst",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    damage: {
      template: "systems/artichron/templates/sheets/pseudo/damage/damage.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {};

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextDamage(context, options) {
    const ctx = context.ctx = {};
    ctx.damageOptions = [2, 3, 4, 6, 8, 10, 12, 14, 20, 100].map(n => ({ value: n, label: `d${n}` }));
    return context;
  }
}
