import {CategoryField} from "../fields/category-field.mjs";
import {FormulaField} from "../fields/formula-field.mjs";
import {IdField} from "../fields/id-field.mjs";
import {QuantityField} from "../fields/quantity-field.mjs";
import {ItemSystemModel} from "./system-model.mjs";

const {SchemaField, StringField, NumberField, ArrayField} = foundry.data.fields;

export default class AmmunitionData extends ItemSystemModel {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    inventorySection: "consumables",
    defaultIcon: "icons/svg/target.svg"
  }, {inplace: false}));

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      quantity: new QuantityField(),
      category: new CategoryField({
        label: "ARTICHRON.ItemProperty.AmmunitionType",
        choices: CONFIG.SYSTEM.AMMUNITION_TYPES
      }),
      range: new SchemaField({
        value: new NumberField({
          integer: true,
          initial: null,
          label: "ARTICHRON.ItemProperty.Range"
        })
      }),
      blast: new SchemaField({
        size: new NumberField({
          integer: true,
          min: 1,
          nullable: true,
          label: "ARTICHRON.ItemProperty.BlastSize"
        }),
        type: new StringField({
          required: true,
          blank: true,
          choices: Object.entries(CONFIG.SYSTEM.AREA_TARGET_TYPES).reduce((acc, [k, v]) => {
            return v.ammo ? Object.assign(acc, {[k]: v}) : acc;
          }, {}),
          label: "ARTICHRON.ItemProperty.BlastType"
        })
      }, {label: "ARTICHRON.ItemProperty.Blast"}),
      damage: new SchemaField({
        override: new SchemaField({
          group: new StringField({
            required: true,
            blank: true,
            choices: {
              all: "ARTICHRON.ItemProperty.AllTypes",
              ...CONFIG.SYSTEM.DAMAGE_TYPE_GROUPS
            }
          }),
          value: new StringField({
            required: true,
            blank: true,
            choices: CONFIG.SYSTEM.DAMAGE_TYPES
          })
        }),
        parts: new ArrayField(new SchemaField({
          id: new IdField(),
          formula: new StringField({
            required: true,
            label: "ARTICHRON.ItemProperty.DamageFormula"
          }),
          type: new StringField({
            choices: CONFIG.SYSTEM.DAMAGE_TYPES,
            label: "ARTICHRON.ItemProperty.DamageType"
          })
        }))
      })
    };
  }

  /** @override */
  get BONUS_FIELDS() {
    const fields = super.BONUS_FIELDS;
    fields.add("system.range.value").add("system.damage.parts");
    return fields;
  }

  /**
   * The properties of a weapon this ammunition modifies.
   * @type {Set<string>}
   */
  get ammoProperties() {
    const props = new Set();
    if (Number.isInteger(this.range.value)) props.add("range");
    if (this.blast.size && this.blast.type) props.add("blast");
    if (this.damage.override.group && this.damage.override.value) props.add("damageOverride");
    if (this._damages.length) props.add("damageParts");
    return props;
  }
}
