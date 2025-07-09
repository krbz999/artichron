import ItemSheetArtichron from "./item-sheet-base.mjs";

/**
 * Physical item sheet that extends the base item sheet. For item types that can have
 * activities, or can fuse, or can support effects.
 */
export default class PhysicalItemSheet extends ItemSheetArtichron {
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

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextDetails(context, options) {
    Object.assign(context.ctx, {
      attrOptions: this.document.system.constructor._attributeChoices(),
      attributes: context.isPlayMode ? context.source.system.attributes.value : context.document.system.attributes.value,
    });
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextEffects(context, options) {
    const fusions = { active: [], inactive: [] };
    const enhancements = [];
    const buffs = [];

    for (const effect of this.document.effects) {
      const data = {
        document: effect,
        classes: ["draggable", effect.disabled ? "inactive" : null].filter(_ => _),
      };

      if (effect.isActiveFusion) fusions.active.push(data);
      else if (effect.isTransferrableFusion) fusions.inactive.push(data);
      else if (effect.type === "enhancement") enhancements.push(data);
      else if (effect.type === "buff") buffs.push(data);
    }

    const sort = (a, b) => artichron.utils.nameSort(a, b, "document");
    fusions.active.sort(sort);
    fusions.inactive.sort(sort);
    enhancements.sort(sort);
    buffs.sort(sort);

    Object.assign(context, { ctx: { effects: { fusions, enhancements, buffs } } });

    return context;
  }
}
