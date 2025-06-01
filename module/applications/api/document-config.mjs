const { HandlebarsApplicationMixin, DocumentSheet } = foundry.applications.api;

export default class DocumentConfig extends HandlebarsApplicationMixin(DocumentSheet) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
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

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    const fn = `_preparePartContext${partId.capitalize()}`;
    if (!(this[fn] instanceof Function)) {
      throw new Error(`The ${this.constructor.name} sheet does not implement the [${fn}] method.`);
    }

    return this[fn](context, options);
  }
}
