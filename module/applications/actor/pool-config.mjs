const {HandlebarsApplicationMixin, DocumentSheetV2} = foundry.applications.api;

export default class PoolConfig extends HandlebarsApplicationMixin(DocumentSheetV2) {
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
  static PARTS = {
    form: {template: "systems/artichron/templates/actor/config/pools.hbs"}
  };

  /* -------------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.format("ARTICHRON.PoolConfig.Title", {name: this.document.name});
  }

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext() {
    const context = {
      pools: {}
    };

    for (const schemaField of this.document.system.schema.fields.pools) {
      const label = `ARTICHRON.ActorProperty.Pools.${schemaField.name.capitalize()}.Label`;
      const fields = {label: label};
      for (const field of schemaField) {
        const value = foundry.utils.getProperty(this.document._source, field.fieldPath);
        fields[field.name] = {field: field, value: value};
      }
      context.pools[schemaField.name] = fields;
      context.pools[schemaField.name].spent.max = this.document.system.pools[schemaField.name].max;
    }

    return context;
  }
}
