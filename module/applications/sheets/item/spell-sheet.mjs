import PhysicalItemSheet from "./physical-item-sheet.mjs";

export default class SpellSheet extends PhysicalItemSheet {
  /** @inheritdoc */
  static metadata = {
    excludeTabs: ["fusion", "advancements"],
  };

  /* -------------------------------------------------- */

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
    activities: {
      template: "systems/artichron/templates/sheets/item/item-sheet/physical/activities.hbs",
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

  /**
   * Prepare a part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<object>}   Rendering context.
   */
  async _preparePartContextActivities(context, options) {
    const activities = this.isEditMode
      ? this.document.system.activities.sourceContents
      : this.document.system.activities;

    context.ctx = {
      activities: activities.map(activity => {
        const isSrc = activity.isSource;
        return {
          document: activity,
          name: activity.name ? activity.name : game.i18n.localize(activity.constructor.metadata.label),
          classes: [isSrc ? "draggable" : "disabled"],
        };
      }),
    };

    return context;
  }
}
