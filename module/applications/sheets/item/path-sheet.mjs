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

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextDescription(context, options) {
    context.ctx = {
      identifiers: [{ value: "", label: "" }],
      attributes: [],
    };

    // Identifiers
    if (this.document.system.attributes.value.has("mixed")) {
      for (const [k, { label }] of Object.entries(artichron.config.PROGRESSION_MIXED_PATHS)) {
        context.ctx.identifiers.push({ value: k, label });
      }
      context.ctx.idHint = game.i18n.localize("ARTICHRON.ITEM.PATH.FIELDS.identifier.hintMixed");
    } else {
      for (const [k, { label }] of Object.entries(artichron.config.PROGRESSION_CORE_PATHS)) {
        context.ctx.identifiers.push({ value: k, label });
      }
    }

    // Attributes
    for (const [k, v] of Object.entries(artichron.config.ITEM_ATTRIBUTES)) {
      if (!v.types || v.types.has(this.document.type)) context.ctx.attributes.push({ value: k, label: v.label });
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextAdvancements(context, options) {
    context.ctx = {
      advancements: {},
    };

    for (const advancement of this.document.getEmbeddedPseudoDocumentCollection("Advancement")) {
      const pts = advancement.requirements.points;
      context.ctx.advancements[pts] ??= { label: `${pts} points required`, entries: [] };
      context.ctx.advancements[pts].entries.push({ document: advancement, classes: ["draggable"] });
    }

    artichron.utils.sortObject(context.ctx.advancements, { inplace: true });

    return context;
  }
}
