import PhysicalItemSheet from "./physical-item-sheet.mjs";

export default class ArmorSheet extends PhysicalItemSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    position: {
      width: 400,
    },
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
    fusion: {
      template: "systems/artichron/templates/sheets/item/item-sheet/physical/fusion.hbs",
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
        { id: "fusion", icon: "fa-solid fa-fw fa-volcano" },
        { id: "effects", icon: "fa-solid fa-fw fa-bolt" },
      ],
      labelPrefix: "ARTICHRON.SHEET.TABS",
      initial: "description",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContextDetails(context, options) {
    context = await super._preparePartContextDetails(context, options);

    // Defenses.
    const defenses = [];
    const field = this.document.system.schema.getField("defenses");
    for (const k of field) {
      const { label, img, color } = artichron.config.DAMAGE_TYPES[k.name];
      const src = this.document.system._source.defenses[k.name];
      defenses.push({
        label, img, color,
        disabled: !(context.editable && context.isEditMode),
        value: context.isEditMode ? (!src ? null : src) : this.document.system.defenses[k.name],
        field: k,
      });
    }

    // Armor requirements.
    const requirements = this.document.system.armor
      .requirements[this.isEditMode ? "sourceContents" : "contents"]
      .map(requirement => ({ document: requirement }));

    Object.assign(context.ctx, {
      requirements,
      defenses: context.isPlayMode ? defenses.filter(d => d.value) : defenses,
      isArmor: true,
    });

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextFusion(context, options) {
    const ctx = context.ctx = { fusions: [] };
    // TODO

    for (const fusion of this.document.effects.documentsByType.fusion) ctx.fusions.push({ document: fusion });
    return context;
  }
}
