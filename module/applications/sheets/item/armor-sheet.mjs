import PhysicalItemSheet from "./physical-item-sheet.mjs";

export default class ArmorSheet extends PhysicalItemSheet {
  /** @inheritdoc */
  static metadata = {
    excludeTabs: ["advancements", "activities"],
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    actions: {
      undoFusion: ArmorSheet.#undoFusion,
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
    for (const r of this.document.system.category.requirements) {
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

  /**
   * Prepare a part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<object>}   Rendering context.
   */
  async _preparePartContextFusion(context, options) {
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
