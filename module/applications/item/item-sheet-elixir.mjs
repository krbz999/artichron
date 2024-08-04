import ItemSheetArtichron from "./item-sheet-base.mjs";

export default class ItemSheetElixir extends ItemSheetArtichron {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["elixir"]
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {template: "systems/artichron/templates/shared/sheet-header.hbs"},
    tabs: {template: "systems/artichron/templates/shared/tabs.hbs"},
    description: {template: "systems/artichron/templates/item/item-description.hbs", scrollable: [""]},
    details: {template: "systems/artichron/templates/item/item-details.hbs", scrollable: [""]},
    secondary: {template: "systems/artichron/templates/item/item-secondary.hbs", scrollable: [""]},
    effects: {template: "systems/artichron/templates/shared/effects.hbs", scrollable: [""]}
  };

  /* -------------------------------------------------- */

  /** @override */
  static TABS = {
    description: {id: "description", group: "primary", label: "ARTICHRON.SheetTab.Description"},
    details: {id: "details", group: "primary", label: "ARTICHRON.SheetTab.Details"},
    secondary: {id: "secondary", group: "primary", label: "ARTICHRON.SheetTab.Properties"},
    effects: {id: "effects", group: "primary", label: "ARTICHRON.SheetTab.Effects"}
  };

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.details.configuration = [
      "price.value",
      "weight.value",
      "quantity.value"
    ].reduce((acc, k) => {
      if (k) acc.push(this._makeField(context, k));
      return acc;
    }, []);

    context.fieldsets.push({
      legend: this.document.system.schema.getField("category").label,
      formGroups: [
        this._makeField(context, "category.subtype"),
        (this.document.system.category.subtype === "booster") ? this._makeField(context, "category.pool") : null
      ].filter(u => u)
    });

    context.fieldsets.push({
      legend: this.document.system.schema.getField("usage").label,
      formGroups: [
        this._makeField(context, "usage.spent", {max: context.document.system.usage.max}),
        this._makeField(context, "usage.max")
      ]
    });

    if (this.document.system.category.subtype === "restorative") {
      context.fieldsets.push({
        legend: this.document.system.schema.getField("healing").label,
        formGroups: [
          this._makeField(context, "healing.formula")
        ]
      });
    }

    return context;
  }
}
