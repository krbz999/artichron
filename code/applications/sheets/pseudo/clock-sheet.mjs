import PseudoDocumentSheet from "../../api/pseudo-document-sheet.mjs";

export default class ClockSheet extends PseudoDocumentSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["clock"],
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    identity: {
      template: "systems/artichron/templates/sheets/pseudo/clock/identity.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextIdentity(context, options) {
    context.ctx = {
      colorPlaceholder: context.pseudoDocument.constructor.metadata.color,
      value: (context.source.value === null) ? null : context.pseudoDocument.value,
    };
    return context;
  }
}
