import ItemSheetArtichron from "./item-sheet-base.mjs";

export default class ItemSheetAmmunition extends ItemSheetArtichron {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["ammo"],
    position: {width: 450}
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {template: "systems/artichron/templates/shared/sheet-header.hbs"},
    tabs: {template: "systems/artichron/templates/shared/tabs.hbs"},
    description: {template: "systems/artichron/templates/item/item-description.hbs", scrollable: [""]},
    details: {template: "systems/artichron/templates/item/item-details.hbs", scrollable: [""]},
    secondary: {template: "systems/artichron/templates/item/item-secondary.hbs", scrollable: [""]}
  };

  /* -------------------------------------------------- */

  /** @override */
  static TABS = {
    description: {id: "description", group: "primary", label: "ARTICHRON.SheetTab.Description"},
    details: {id: "details", group: "primary", label: "ARTICHRON.SheetTab.Details"},
    secondary: {id: "secondary", group: "primary", label: "ARTICHRON.SheetTab.Properties"}
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
      formGroups: [this._makeField(context, "category.subtype")]
    });

    context.fieldsets.push({
      legend: "TODO",
      formGroups: [
        this._makeField(context, "range.value"),
        this._makeField(context, "blast.size"),
        this._makeField(context, "blast.type"),
        this._makeField(context, "damage.override.group"),
        this._makeField(context, "damage.override.value")
      ]
    });

    return context;
  }
}
