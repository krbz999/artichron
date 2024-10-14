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
    activities: {template: "systems/artichron/templates/item/item-activities.hbs", scrollable: [""]}
  };

  /* -------------------------------------------------- */

  /** @override */
  static TABS = {
    description: {id: "description", group: "primary", label: "ARTICHRON.SheetLabels.Description"},
    details: {id: "details", group: "primary", label: "ARTICHRON.SheetLabels.Details"},
    activities: {id: "activities", group: "primary", label: "ARTICHRON.SheetLabels.Activities"}
  };

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.details.configuration = [
      "category.subtype",
      "price.value",
      "weight.value",
      "quantity.value"
    ].reduce((acc, k) => {
      if (k) acc.push(this._makeField(context, k));
      return acc;
    }, []);

    return context;
  }
}
