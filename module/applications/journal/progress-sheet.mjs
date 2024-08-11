/*
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
  */

export default class ProgressPageSheet extends JournalPageSheet {
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes.push("artichron");
    options.template = "systems/artichron/templates/journal/page-progress-edit.hbs";
    options.submitOnChange = true;
    return options;
  }

  get template() {
    if (this.isEditable) return "systems/artichron/templates/journal/page-progress-edit.hbs";
    return "systems/artichron/templates/journal/page-progress-view.hbs";
  }

  async getData() {
    if (!this.isEditable) {
      const element = await this.document.system.toEmbed();
      return {element: element.outerHTML};
    }

    return this._prepareContext();
  }

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
    context.description = prepareField("system.description");
    context.description.enriched = await TextEditor.enrichHTML(context.description.value, {relativeTo: this.document});
    context.type = prepareField("system.type");

    return context;
  }
}
