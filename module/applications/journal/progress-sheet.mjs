export default class ProgressPageSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.DocumentSheetV2
) {

  static DEFAULT_OPTIONS = {
    classes: ["artichron"],
    window: {contentClasses: ["standard-form"]},
    form: {submitOnChange: true}
  };

  static PARTS = {
    form: {
      template: "systems/artichron/templates/journal/page-progress.hbs"
    }
  };

  async _prepareContext(options) {
    const context = {};

    const prepareField = path => {
      const isSystem = path.startsWith("system");
      const schema = isSystem ? this.document.system.schema : this.document.schema;
      return {
        field: schema.getField(isSystem ? path.slice(7) : path),
        value: foundry.utils.getProperty(this.document, path)
      };
    };

    context.name = prepareField("name");
    context.value = prepareField("system.value");
    context.max = prepareField("system.max");

    return context;
  }

  // ???
  async _buildEmbedHTML(config, options = {}) {
    const element = await this.document.toEmbed(config, options);
    return element.outerHTML;
  }

  /** @override */
  _initializeApplicationOptions(options) {
    options.uniqueId = `${this.constructor.name}-${options.document?.uuid}`;
    return options;
  }

  // ???
  _canUserView() {
    return true;
  }

  // ???
  async getData() {
    return this._prepareContext();
  }
}
