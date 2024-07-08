const {HandlebarsApplicationMixin, DocumentSheetV2} = foundry.applications.api;

export default class BaseConfig extends HandlebarsApplicationMixin(DocumentSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron"],
    sheetConfig: false,
    position: {
      width: 400,
      height: "auto"
    },
    window: {
      contentClasses: ["standard-form"]
    },
    form: {
      closeOnSubmit: false,
      submitOnChange: true
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {};

  /* -------------------------------------------------- */

  /** @override */
  get title() {
    throw new Error("Subclasses of BaseConfig must override the title getter.");
  }
}
