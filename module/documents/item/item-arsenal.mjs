import FusionTemplateMixin from "./templates/fusion-data.mjs";
import ItemSystemModel from "./system-model.mjs";

const {NumberField, SchemaField} = foundry.data.fields;

export default class ArsenalData extends ItemSystemModel.mixin(
  FusionTemplateMixin
) {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").ItemSystemModelMetadata}
   */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    fusion: true,
    inventorySection: "arsenal"
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      wield: new SchemaField({
        value: new NumberField({initial: 1, choices: CONFIG.SYSTEM.WIELDING_TYPES})
      })
    };
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  static get BONUS_FIELDS() {
    const bonus = super.BONUS_FIELDS;
    bonus.add("system.wield.value");
    return bonus;
  }

  /* -------------------------------------------------- */

  /**
   * Is this a one-handed item?
   * @type {boolean}
   */
  get isOneHanded() {
    return this.wield.value === 1;
  }

  /* -------------------------------------------------- */

  /**
   * Is this a two-handed item?
   * @type {boolean}
   */
  get isTwoHanded() {
    return this.wield.value === 2;
  }

  /* -------------------------------------------------- */

  /**
   * Can this item be used to make an attack due to action point cost?
   * @type {boolean}
   */
  get canUsePips() {
    return this.parent.actor.canPerformActionPoints(this.cost.value);
  }

  /* -------------------------------------------------- */

  /**
   * Can this item be used to defend?
   * @type {boolean}
   */
  get canDefend() {
    const attr = this.attributes.value;
    if (!attr.has("parrying") && !attr.has("blocking")) return false;
    return this.activities.getByType("defend").length > 0;
  }
}
