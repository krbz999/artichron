import PhysicalItemSheet from "./physical-item-sheet.mjs";

export default class AmmoSheet extends PhysicalItemSheet {
  /** @inheritdoc */
  static PARTS = {
    header: {
      template: "systems/artichron/templates/sheets/item/item-sheet/header.hbs",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    description: {
      template: "systems/artichron/templates/sheets/item/item-sheet/description.hbs",
      scrollable: [""],
    },
    details: {
      template: "systems/artichron/templates/sheets/item/item-sheet/physical/details.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
    effects: {
      template: "systems/artichron/templates/sheets/item/item-sheet/physical/effects.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "description", icon: "fa-solid fa-fw fa-pen-fancy" },
        { id: "details", icon: "fa-solid fa-fw fa-tags" },
        { id: "effects", icon: "fa-solid fa-fw fa-bolt" },
      ],
      labelPrefix: "ARTICHRON.SHEET.TABS",
      initial: "description",
    },
  };
}
