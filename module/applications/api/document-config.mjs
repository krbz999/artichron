import ArtichronApplicationMixin from "./artichron-application-mixin.mjs";

const { DocumentSheet } = foundry.applications.api;

export default class DocumentConfig extends ArtichronApplicationMixin(DocumentSheet) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["config"],
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    position: {
      width: 400,
      height: "auto",
    },
    window: {
      title: null,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return `${game.i18n.localize(this.options.window.title)}: ${this.document.name}`;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    return {
      document: this.document,
      source: this.document._source,
      fields: this.document.schema.fields,
      systemFields: this.document.system.schema.fields,
    };
  }
}
