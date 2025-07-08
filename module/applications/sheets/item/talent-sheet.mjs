import ItemSheetArtichron from "./item-sheet-base.mjs";

export default class TalentSheet extends ItemSheetArtichron {
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

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "description", icon: "fa-solid fa-fw fa-pen-fancy" },
        { id: "details", icon: "fa-solid fa-fw fa-tags" },
        { id: "advancements", icon: "fa-solid fa-fw fa-circle-nodes" },
        { id: "effects", icon: "fa-solid fa-fw fa-bolt" },
      ],
      labelPrefix: "ARTICHRON.SHEET.TABS",
      initial: "description",
    },
  };

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextDetails(context, options) {
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextAdvancements(context, options) {
    const ctx = context.ctx = {};
    const arr = ctx.advancements = [];
    for (const advancement of this.document.getEmbeddedPseudoDocumentCollection("Advancement").sourceContents) {
      arr.push({ document: advancement, classes: ["draggable"] });
    }
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextEffects(context, options) {
    context.ctx = { buffs: { active: [], inactive: [] } };

    for (const effect of this.document.effects.documentsByType.buff) {
      const data = { document: effect, classes: ["draggable"] };
      if (effect.disabled) {
        data.classes.push("inactive");
        context.ctx.buffs.inactive.push(data);
      } else {
        context.ctx.buffs.active.push(data);
      }
    }

    context.ctx.buffs.active.sort((a, b) => artichron.utils.nameSort(a, b, "document"));
    context.ctx.buffs.inactive.sort((a, b) => artichron.utils.nameSort(a, b, "document"));
    return context;
  }
}
