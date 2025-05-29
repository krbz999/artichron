import ItemSheetArtichron from "./item-sheet-base.mjs";

export default class TalentSheet extends ItemSheetArtichron {
  /** @inheritdoc */
  static metadata = {
    excludeTabs: ["fusion", "activities"],
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
      template: "systems/artichron/templates/sheets/item/item-sheet/talent/details.hbs",
    },
    advancements: {
      template: "systems/artichron/templates/sheets/item/item-sheet/talent/advancements.hbs",
    },
    effects: {
      template: "systems/artichron/templates/sheets/item/item-sheet/talent/effects.hbs",
    },
  };

  /* -------------------------------------------------- */

  /**
   * Prepare a part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<object>}   Rendering context.
   */
  async _preparePartContextDetails(context, options) {
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare a part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<object>}   Rendering context.
   */
  async _preparePartContextAdvancements(context, options) {
    context.ctx = {};
    const arr = context.ctx.advancements = [];
    for (const a of this.document.system.advancements) {
      arr.push({
        advancement: a,
      });
    }
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare a part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<object>}   Rendering context.
   */
  async _preparePartContextEffects(context, options) {
    context.ctx = { buffs: { active: [], inactive: [] } };

    for (const effect of this.document.effects.documentsByType.buff) {
      const data = { effect };

      if (effect.disabled) context.ctx.buffs.inactive.push(data);
      else context.ctx.buffs.active.push(data);
    }

    context.ctx.buffs.active.sort((a, b) => artichron.utils.nameSort(a, b, "effect"));
    context.ctx.buffs.inactive.sort((a, b) => artichron.utils.nameSort(a, b, "effect"));
    return context;
  }
}
