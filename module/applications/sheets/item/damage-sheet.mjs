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
      template: "systems/artichron/templates/sheets/pseudo/damage/damage.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {};

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextDamage(context, options) {
    context.ctx = {
      typeOptions: artichron.config.DAMAGE_TYPES.optgroups,
      optionsOptions: Object.entries(artichron.config.ITEM_ATTRIBUTES)
        .filter(([k, v]) => v.damageOption)
        .map(([k, v]) => ({ value: k, label: v.label })),
    };
    return context;
  }
}
