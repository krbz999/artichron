import ArmorRequirementData from "../data/armor-requirements.mjs";
import CollectionField from "../data/fields/collection-field.mjs";
import ItemSystemModel from "./system-model.mjs";
import FusionField from "../data/fields/fusion-field.mjs";

const { NumberField, SchemaField, StringField } = foundry.data.fields;

export default class ArmorData extends ItemSystemModel {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").ItemSystemModelMetadata}
   */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    defaultWeight: 2,
    inventorySection: "gear",
    order: 40,
    type: "armor",
  }, { inplace: false }));

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: new SchemaField({
        value: new StringField({
          required: true,
          blank: true,
          choices: () => ({
            "": game.i18n.localize("ARTICHRON.EQUIPMENT.CATEGORY.None"),
            ...artichron.config.EQUIPMENT_CATEGORIES,
          }),
        }),
        subtype: new StringField({
          required: true,
          initial: () => Object.keys(artichron.config.EQUIPMENT_TYPES)[0],
          choices: artichron.config.EQUIPMENT_TYPES,
        }),
        requirements: new CollectionField(ArmorRequirementData),
      }),
      defenses: new SchemaField(artichron.config.DAMAGE_TYPES.optgroups.reduce((acc, { value: k }) => {
        acc[k] = new SchemaField({ value: new NumberField({ integer: true, initial: null }) });
        return acc;
      }, {})),
      fusion: new FusionField(),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set(
      Object.keys(artichron.config.DAMAGE_TYPES).map(k => `system.defenses.${k}.value`),
    ));
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ITEM.ARMOR",
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

  /** @inheritdoc */
  async _prepareTooltipContext() {
    const context = await super._prepareTooltipContext();

    context.requirements = this.category.requirements.map(r => {
      return { content: r.toRequirement(), fulfilled: r.fulfilledRequirements };
    });

    context.defenses = Object.entries(this.defenses).reduce((acc, [type, { value }]) => {
      if (value) acc.push({
        value: value,
        config: artichron.config.DAMAGE_TYPES[type],
      });
      return acc;
    }, []);

    return context;
  }
}
