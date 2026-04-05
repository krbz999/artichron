import PseudoDocumentSheet from "../../api/pseudo-document-sheet.mjs";

export default class ArmorRequirementSheet extends PseudoDocumentSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["armor-requirement"],
    window: {},
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    details: {
      template: "systems/artichron/templates/sheets/pseudo/armor-requirement/details.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextDetails(context, options) {
    const ctx = context.ctx = {
      requirement: context.pseudoDocument.toRequirement(),
    };
    return context;
  }
}
