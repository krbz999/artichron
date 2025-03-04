import ItemSheetArtichron from "./item-sheet-base.mjs";

export default class ItemSheetElixir extends ItemSheetArtichron {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["elixir"],
    position: { width: 450 },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    header: {
      template: "systems/artichron/templates/shared/sheet-header.hbs",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    description: {
      template: "systems/artichron/templates/item/item-description.hbs",
      scrollable: [""],
    },
    details: {
      template: "systems/artichron/templates/item/item-details.hbs",
      scrollable: [""],
    },
    activities: {
      template: "systems/artichron/templates/item/item-activities.hbs",
      scrollable: [""],
    },
    effects: {
      template: "systems/artichron/templates/shared/effects.hbs",
      scrollable: [""],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "description", label: "ARTICHRON.SheetLabels.Description" },
        { id: "details", label: "ARTICHRON.SheetLabels.Details" },
        { id: "activities", label: "ARTICHRON.SheetLabels.Activities" },
        { id: "effects", label: "ARTICHRON.SheetLabels.Effects" },
      ],
      initial: "description",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.details.configuration = [
      "price.value",
      "weight.value",
      "quantity.value",
    ].reduce((acc, k) => {
      if (k) acc.push(this._makeField(context, k));
      return acc;
    }, []);

    context.fieldsets.push({
      legend: this.document.system.schema.getField("usage").label,
      formGroups: [
        this._makeField(context, "usage.spent", { max: context.document.system.usage.max }),
        this._makeField(context, "usage.max"),
      ],
    });

    return context;
  }
}
