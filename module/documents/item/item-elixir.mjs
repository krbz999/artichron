import ItemSystemModel from "./system-model.mjs";

const {SchemaField, NumberField, StringField} = foundry.data.fields;

export default class ElixirData extends ItemSystemModel {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").ItemSystemModelMetadata}
   */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    defaultWeight: 0.5,
    inventorySection: "consumables",
    order: 50,
    type: "elixir"
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      quantity: new SchemaField({
        value: new NumberField({initial: 1, min: 0, integer: true, nullable: false})
      }),
      usage: new SchemaField({
        spent: new NumberField({integer: true, min: 0, initial: 0, nullable: false}),
        max: new NumberField({min: 1, integer: true, initial: 1, nullable: false})
      })
    };
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  static get BONUS_FIELDS() {
    const bonus = super.BONUS_FIELDS;
    bonus.add("system.usage.max");
    return bonus;
  }

  /* -------------------------------------------------- */

  /**
   * Does this item have a limited number of uses remaining?
   * @type {boolean}
   */
  get hasUses() {
    const use = this.usage;
    const qty = this.quantity;
    return (use.value > 0) && (use.max > 0) && (qty.value > 0);
  }

  /* -------------------------------------------------- */

  /**
   * Does this item have any effects that can be transferred to the actor when this item is used?
   * @type {boolean}
   */
  get hasTransferrableEffects() {
    return super.hasTransferrableEffects && this.hasUses;
  }

  /* -------------------------------------------------- */
  /*   Life-cycle methods                               */
  /* -------------------------------------------------- */

  /** @override */
  async _preUpdate(change, options, user) {
    const allowed = await super._preUpdate(change, options, user);
    if (allowed === false) return false;

    // Allow for updating usage.value directly.
    const usage = change.system?.usage ?? {};
    if (("value" in usage) && !("spent" in usage)) {
      const max = usage.max ?? this.usage.max;
      usage.spent = Math.clamp(max - usage.value, 0, max);
    }
  }

  /* -------------------------------------------------- */
  /*   Data preparation                                 */
  /* -------------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.usage.value = Math.max(0, this.usage.max - this.usage.spent);
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /* -------------------------------------------------- */

  /**
   * Utility method for crafting the usage update for an elixir.
   * @param {number} [uses]         The uses to subtract, or the value to set to.
   * @param {boolean} [isDelta]     Whether this modifies the current uses, or overrides the value.
   * @returns {object}
   */
  _usageUpdate(uses = 1, isDelta = true) {
    const update = {_id: this.parent.id};
    let spent;

    if (isDelta) {
      if (uses === 0) return update;
      const invalid = !uses.between(-this.usage.spent, this.usage.value);
      if (invalid) throw new Error(`You cannot subtract ${uses} uses from ${this.parent.name}`);
      spent = this.usage.spent + uses;
    } else {
      const invalid = !uses.between(0, this.usage.max);
      if (invalid) throw new Error(`You cannot set ${this.parent.name} to have ${uses} uses.`);
      spent = this.usage.max - uses;
    }

    if (spent === this.usage.max) {
      update["system.usage.spent"] = 0;
      update["system.quantity.value"] = this.quantity.value - 1;
    } else {
      update["system.usage.spent"] = spent;
    }
    return update;
  }

  /* -------------------------------------------------- */
  /*   Tooltips                                         */
  /* -------------------------------------------------- */

  /** @override */
  _prepareTooltipProperties() {
    const props = super._prepareTooltipProperties();
    props.push({title: "Uses", label: `${this.usage.value}/${this.usage.max}`, icon: "fa-solid fa-flask"});
    return props;
  }
}
