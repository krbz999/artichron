import PhysicalItemSheet from "./physical-item-sheet.mjs";

export default class ArmorSheet extends PhysicalItemSheet {
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
  static TABS = {
    primary: {
      tabs: [
        { id: "description" },
        { id: "details" },
        { id: "fusion" },
        { id: "effects" },
      ],
      initial: "description",
      labelPrefix: "ARTICHRON.SHEET.TABS",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContextDetails(context, options) {
    context = await super._preparePartContextDetails(context, options);

    // Resistances
    const field = this.document.system.schema.getField("defenses");
    const defenses = {
      legend: field.label,
      values: [],
    };
    for (const k of field) {
      const value = foundry.utils.getProperty(
        context.isEditMode ? context.source : context.document,
        k.fields.value.fieldPath,
      );
      defenses.values.push({
        ...artichron.config.DAMAGE_TYPES[k.name],
        field: k.fields.value,
        value: context.isPlayMode ? (value ?? 0) : (value ? value : null),
        active: context.isEditMode || !!value,
      });
    }

    // Armor requirements
    const requirements = [];
    for (const r of this.document.system.category.requirements) {
      requirements.push({
        disabled: !r.isSource,
        requirement: r,
        hint: game.i18n.localize(r.constructor.metadata.hint),
      });
    }

    Object.assign(context.ctx, { isArmor: true, defenses, requirements });

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
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static async #undoFusion(event, target) {
    if (!this.isEditable) return;
    const effect = await fromUuid(target.closest("[data-item-uuid]").dataset.itemUuid);
    effect.unfuseDialog();
  }
}
