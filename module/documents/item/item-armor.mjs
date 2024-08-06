import ArmorRequirementData from "../fields/armor-requirements.mjs";
import ItemSystemModel from "./system-model.mjs";
import FusionTemplateMixin from "./templates/fusion-data.mjs";

const {ArrayField, NumberField, SchemaField, StringField, TypedSchemaField} = foundry.data.fields;

export default class ArmorData extends FusionTemplateMixin(ItemSystemModel) {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    inventorySection: "gear",
    type: "armor",
    defaultWeight: 2
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      resistances: new SchemaField(Object.entries(CONFIG.SYSTEM.DAMAGE_TYPES).reduce((acc, [k, v]) => {
        if (v.resist) acc[k] = new SchemaField({value: new NumberField({integer: true, min: 0})});
        return acc;
      }, {})),
      armor: new SchemaField({
        value: new NumberField({min: 0, integer: true})
      }),
      category: new SchemaField({
        subtype: new StringField({
          required: true,
          initial: () => Object.keys(CONFIG.SYSTEM.EQUIPMENT_TYPES)[0],
          choices: CONFIG.SYSTEM.EQUIPMENT_TYPES
        }),
        requirements: new ArrayField(new TypedSchemaField(ArmorRequirementData.TYPES))
      })
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "system.armor.value",
      ...Object.entries(CONFIG.SYSTEM.DAMAGE_TYPES).reduce((acc, [k, v]) => {
        if (v.resist) acc.push(`system.resistances.${k}.value`);
        return acc;
      }, [])
    ]));
  }

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ItemProperty.ArmorProperty"
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

    context.resistances = Object.entries(this.resistances).reduce((acc, [type, {value}]) => {
      if (value) acc.push({
        value: value,
        config: CONFIG.SYSTEM.DAMAGE_TYPES[type]
      });
      return acc;
    }, []);

    return context;
  }

  /* -------------------------------------------------- */

  /** @override */
  _prepareTooltipProperties() {
    const props = super._prepareTooltipProperties();
    props.push({title: "Armor", label: this.armor.value ?? 0, icon: "fa-solid fa-shield"});
    return props;
  }
}
