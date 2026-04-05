import ItemSheetArtichron from "./item-sheet-base.mjs";

export default class PathSheet extends ItemSheetArtichron {
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
      scrollable: [".document-list.advancements section.scrollable"],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "description", icon: "fa-solid fa-fw fa-pen-fancy" },
        { id: "advancements", icon: "fa-solid fa-fw fa-circle-nodes" },
      ],
      labelPrefix: "ARTICHRON.SHEET.TABS",
      initial: "description",
    },
  };

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextDescription(context, options) {
    context.ctx = {
      identifiers: [],
      attributes: [],
    };

    // Identifiers. TODO: consider moving more of this into config.
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
    const ctx = context.ctx = { advancements: {} };

    for (const advancement of this.document.getEmbeddedPseudoDocumentCollection("Advancement")) {
      const pts = advancement.levels;
      for (const p of pts) {
        ctx.advancements[p] ??= {
          label: game.i18n.format("ARTICHRON.SHEET.PATH.HEADERS.pointsRequired", { points: p }),
          entries: [],
        };
        ctx.advancements[p].entries.push({ document: advancement, classes: ["draggable"] });
      }

      if (!pts.length) {
        ctx.advancements.empty ??= {
          label: game.i18n.localize("ARTICHRON.SHEET.PATH.HEADERS.inapplicable"),
          entries: [],
        };
        ctx.advancements.empty.entries.push({ document: advancement });
      }
    }

    artichron.utils.sortObject(ctx.advancements, { inplace: true });

    return context;
  }
}
