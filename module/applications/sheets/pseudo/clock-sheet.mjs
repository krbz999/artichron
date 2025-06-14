import PseudoDocumentSheet from "../../api/pseudo-document-sheet.mjs";

export default class ClockSheet extends PseudoDocumentSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["clock"],
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    identity: {
      template: "systems/artichron/templates/sheets/pseudo/clock/identity.hbs",
    },
    details: {
      template: "systems/artichron/templates/sheets/pseudo/clock/details.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "identity", icon: "fa-solid fa-tag" },
        { id: "details", icon: "fa-solid fa-pen-fancy" },
      ],
      initial: "identity",
      labelPrefix: "ARTICHRON.SHEET.TABS",
    },
  };

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextIdentity(context, options) {
    context.ctx = {
      colorPlaceholder: context.pseudoDocument.constructor.metadata.color,
    };
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextDetails(context, options) {
    context.ctx = {
      enriched: await foundry.applications.ux.TextEditor.enrichHTML(context.pseudoDocument.description),
    };
    return context;
  }
}
