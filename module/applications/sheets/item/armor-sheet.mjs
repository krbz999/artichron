import PhysicalItemSheet from "./physical-item-sheet.mjs";

export default class ArmorSheet extends PhysicalItemSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    actions: {
      undoFusion: ArmorSheet.#undoFusion,
    },
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
    const defenses = context.ctx.defenses = [];
    const field = this.document.system.schema.getField("defenses");
    for (const k of field) {
      const { label, icon, color } = artichron.config.DAMAGE_TYPES[k.name];
      const src = this.document.system.defenses[k.name].value;
      defenses.push({
        label, icon, color,
        disabled: !(context.editable && context.isEditMode),
        value: context.isEditMode ? (!src ? null : src) : this.document.system.defenses[k.name].value,
        field: k.fields.value,
      });
    }

    // Armor requirements.
    const requirements = context.ctx.requirements = [];
    for (const r of this.document.system.armor.requirements) {
      if (this.isEditMode && !r.isSource) continue;
      requirements.push({
        document: r,
        hint: game.i18n.localize(r.constructor.metadata.hint),
      });
    }

    Object.assign(context.ctx, { isArmor: true });

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextFusion(context, options) {
    const ctx = context.ctx = {};
    return context;
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle click events to unfuse this item.
   * @this {PhysicalItemSheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static async #undoFusion(event, target) {
    if (!this.isEditable) return;
    const effect = await fromUuid(target.closest("[data-item-uuid]").dataset.itemUuid);
    effect.unfuseDialog();
  }
}
