import PhysicalItemSheet from "./physical-item-sheet.mjs";

export default class SpellSheet extends PhysicalItemSheet {
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

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "description" },
        { id: "details" },
        { id: "activities" },
        { id: "effects" },
      ],
      initial: "description",
      labelPrefix: "ARTICHRON.SHEET.TABS",
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
        return {
          activity,
          name: activity.name ? activity.name : game.i18n.localize(activity.constructor.metadata.label),
          subtitle: game.i18n.localize(activity.constructor.metadata.label),
          disabled: !activity.isSource,
        };
      }),
    };

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this._createContextMenu(this._getActivityEntryContextOptions, "[data-pseudo-document-name=Activity] [data-pseudo-id]", {
      hookName: "ActivityEntryContext",
    });
  }

  /* -------------------------------------------------- */

  /**
   * Create context menu option for activities.
   * @returns {ContextMenuEntry[]}
   */
  _getActivityEntryContextOptions() {
    return [{
      name: "ARTICHRON.ContextMenu.Activity.Render",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).sheet.render({ force: true }),
    }, {
      name: "ARTICHRON.ContextMenu.Activity.Delete",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).delete(),
    }, {
      name: "ARTICHRON.ContextMenu.Activity.Duplicate",
      icon: "<i class='fa-solid fa-fw fa-copy'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).duplicate(),
    }];
  }
}
