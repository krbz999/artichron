const { HTMLField, SchemaField, SetField, StringField } = foundry.data.fields;

export default class ItemSystemModel extends foundry.abstract.TypeDataModel {
  /** @type {import("../../_types").ItemSubtypeMetadata} */
  static get metadata() {
    return {
      embedded: {},
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      attributes: new SchemaField({
        value: new SetField(new StringField()),
      }),

      description: new SchemaField({
        value: new HTMLField({ required: true }),
      }),

      identifier: new artichron.data.fields.IdentifierField(),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    "ARTICHRON.ITEM",
  ];

  /* -------------------------------------------------- */
  /*   Life-cycle methods                               */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preCreate(data, options, user) {
    if (await super._preCreate(data, options, user) === false) return false;

    const update = {};
    if (!this.identifier) {
      update["system.identifier"] = this.parent.name.slugify({ strict: true });
    }
    if (!foundry.utils.isEmpty(update)) this.parent.updateSource(update);
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Perform the function of an activity of this item.
   * @returns {Promise}
   */
  async use(usage = {}, { event, ...dialog } = {}, message = {}) {
    const activities = this.activities;
    if (!activities.size) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoActivities", { localize: true });
      return;
    }

    let activity;
    if ((activities.size === 1) || event?.shiftKey) activity = activities.contents[0];
    else {
      const configuration = await artichron.applications.apps.item.ActivitySelectDialog.create({ item: this.parent });
      if (!configuration) return null;
      activity = activities.get(configuration.activity);
      return activity.use(usage, { ...dialog, ...configuration }, message);
    }

    if (activity) return activity.use(usage, { ...dialog, event }, message);
    return null;
  }

  /* -------------------------------------------------- */

  /**
   * Retrieve an object for roll data.
   * @returns {object}
   */
  getRollData() {
    return { ...this };
  }

  /* -------------------------------------------------- */
  /*   Tooltips                                         */
  /* -------------------------------------------------- */

  /**
   * Create data for an enriched tooltip.
   * @returns {Promise<HTMLElement[]>}
   */
  async richTooltip() {
    const template = "systems/artichron/templates/ui/item/tooltip.hbs";
    const context = await this._prepareTooltipContext();
    const div = document.createElement("DIV");
    div.innerHTML = await foundry.applications.handlebars.renderTemplate(template, context);
    div.classList.add(this.parent.type);
    return div.children;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context object for this item's tooltip.
   * @returns {Promise<object>}
   */
  async _prepareTooltipContext() {
    const item = this.parent;
    const rollData = this.parent.getRollData();
    const description = await foundry.applications.ux.TextEditor.enrichHTML(this.description.value, {
      rollData: rollData, relativeTo: item,
    });

    const context = {
      item: item,
      rollData: rollData,
      description: description,
      subtitle: game.i18n.localize(`TYPES.Item.${this.parent.type}`),
      tags: this._prepareTooltipTags(),
      properties: this._prepareTooltipProperties(),
    };
    context.propsCol = Math.min(4, context.properties.length);

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare tags for item tooltips.
   * @returns {object[]}
   */
  _prepareTooltipTags() {
    const tags = [];

    for (const attribute of this.attributes.value) {
      const conf = artichron.config.ITEM_ATTRIBUTES[attribute];
      const valid = !!conf && (!conf.types.size || conf.types.has(this.parent.type));
      if (valid) tags.push({ label: conf.label });
    }

    return tags;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare properties for item tooltips.
   * @returns {object[]}
   */
  _prepareTooltipProperties() {
    const props = [];

    props.push({ title: "Price", label: this.price.value ?? 0, icon: "fa-solid fa-sack-dollar" });
    props.push({ title: "Weight", label: this.weight.total, icon: "fa-solid fa-weight-hanging" });

    if (this.schema.has("quantity")) {
      props.push({ title: "Qty", label: this.quantity.value ?? 0, icon: "fa-solid fa-cubes-stacked" });
    }

    return props;
  }

  /* -------------------------------------------------- */
  /*   Preparation methods                              */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    if (!this.weight) {
      this.weight = { total: 0 };
    } else {
      this.weight.total = this.weight.value * (this.quantity?.value ?? 1);
    }
  }
}
