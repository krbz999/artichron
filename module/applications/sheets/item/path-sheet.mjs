import ItemSheetArtichron from "./item-sheet-base.mjs";

export default class PathSheet extends ItemSheetArtichron {
  /** @inheritdoc */
  static metadata = {
    excludeTabs: ["fusion", "activities", "effects", "details"],
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
      template: "systems/artichron/templates/sheets/item/item-sheet/path/description.hbs",
      scrollable: [""],
    },
    advancements: {
      template: "systems/artichron/templates/sheets/item/item-sheet/path/advancements.hbs",
    },
  };

  /* -------------------------------------------------- */

  /**
   * Prepare a part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<object>}   Rendering context.
   */
  async _preparePartContextAdvancements(context, options) {
    context.ctx = {
      advancements: {},
    };

    for (const advancement of this.document.getEmbeddedPseudoDocumentCollection("Advancement")) {
      const pts = advancement.requirements.points;
      context.ctx.advancements[pts] ??= { label: `${pts} points required`, entries: [] };
      context.ctx.advancements[pts].entries.push({ document: advancement });
    }

    artichron.utils.sortObject(context.ctx.advancements, { inplace: true });

    return context;
  }
}
