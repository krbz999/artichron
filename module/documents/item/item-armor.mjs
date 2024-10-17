import ArmorRequirementData from "../fields/armor-requirements.mjs";
import ItemSystemModel from "./system-model.mjs";
import FusionTemplateMixin from "./templates/fusion-data.mjs";

const {ArrayField, NumberField, SchemaField, StringField, TypedSchemaField} = foundry.data.fields;

export default class ArmorData extends FusionTemplateMixin(ItemSystemModel) {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").ItemSystemModelMetadata}
   */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    defaultWeight: 2,
    inventorySection: "gear",
    order: 40,
    type: "armor"
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: new SchemaField({
        value: new StringField({
          required: true,
          blank: true,
          choices: () => ({
            "": game.i18n.localize("ARTICHRON.EQUIPMENT.CATEGORY.None"),
            ...CONFIG.SYSTEM.EQUIPMENT_CATEGORIES
          })
        }),
        subtype: new StringField({
          required: true,
          initial: () => Object.keys(CONFIG.SYSTEM.EQUIPMENT_TYPES)[0],
          choices: CONFIG.SYSTEM.EQUIPMENT_TYPES
        }),
        requirements: new ArrayField(new TypedSchemaField(ArmorRequirementData.TYPES))
      }),
      defenses: new SchemaField(CONFIG.SYSTEM.DAMAGE_TYPES.optgroups.reduce((acc, {value: k}) => {
        acc[k] = new SchemaField({value: new NumberField({integer: true, initial: null})});
        return acc;
      }, {}))
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set(
      Object.keys(CONFIG.SYSTEM.DAMAGE_TYPES).map(k => `system.defenses.${k}.value`)
    ));
  }

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ITEM.ARMOR"
  ];

  /* -------------------------------------------------- */

  /**
   * Does the owner of this item fulfill all the requirements to gain its benefits?
   * @type {boolean}
   */
  get fulfilledRequirements() {
    for (const r of this.category.requirements) {
      if (!r.fulfilledRequirements) return false;
    }
    return true;
  }

  /* -------------------------------------------------- */
  /*   Tooltips                                         */
  /* -------------------------------------------------- */

  /** @override */
  async _prepareTooltipContext() {
    const context = await super._prepareTooltipContext();

    context.requirements = this.category.requirements.map(r => {
      return {content: r.toRequirement(), fulfilled: r.fulfilledRequirements};
    });

    context.defenses = Object.entries(this.defenses).reduce((acc, [type, {value}]) => {
      if (value) acc.push({
        value: value,
        config: CONFIG.SYSTEM.DAMAGE_TYPES[type]
      });
      return acc;
    }, []);

    return context;
  }
}
