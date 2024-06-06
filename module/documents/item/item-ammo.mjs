import {IdField} from "../fields/id-field.mjs";
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
      quantity: new SchemaField({
        value: new NumberField({
          initial: 1,
          min: 0,
          integer: true,
          nullable: true,
          label: "ARTICHRON.ItemProperty.Quantity.Value",
          hint: "ARTICHRON.ItemProperty.Quantity.ValueHint"
        })
      }),
      category: new SchemaField({
        subtype: new StringField({
          label: "ARTICHRON.ItemProperty.Category.SubtypeAmmo",
          hint: "ARTICHRON.ItemProperty.Category.SubtypeAmmoHint",
          choices: CONFIG.SYSTEM.AMMUNITION_TYPES
        })
      }),
      range: new SchemaField({
        value: new NumberField({
          integer: true,
          initial: null,
          label: "ARTICHRON.ItemProperty.Range.Value",
          hint: "ARTICHRON.ItemProperty.Range.ValueHint"
        })
      }),
      blast: new SchemaField({
        size: new NumberField({
          integer: true,
          min: 1,
          nullable: true,
          label: "ARTICHRON.ItemProperty.Blast.Size",
          hint: "ARTICHRON.ItemProperty.Blast.SizeHint"
        }),
        type: new StringField({
          required: true,
          blank: true,
          choices: Object.entries(CONFIG.SYSTEM.AREA_TARGET_TYPES).reduce((acc, [k, v]) => {
            return v.ammo ? Object.assign(acc, {[k]: v}) : acc;
          }, {}),
          label: "ARTICHRON.ItemProperty.Blast.Type",
          hint: "ARTICHRON.ItemProperty.Blast.TypeHint"
        })
      }),
      damage: new SchemaField({
        override: new SchemaField({
          group: new StringField({
            required: true,
            blank: true,
            choices: {
              all: "ARTICHRON.ItemProperty.Damage.Override.GroupChoiceAll",
              ...CONFIG.SYSTEM.DAMAGE_TYPE_GROUPS
            },
            label: "ARTICHRON.ItemProperty.Damage.Override.Group",
            hint: "ARTICHRON.ItemProperty.Damage.Override.GroupHint"
          }),
          value: new StringField({
            required: true,
            blank: true,
            choices: CONFIG.SYSTEM.DAMAGE_TYPES,
            label: "ARTICHRON.ItemProperty.Damage.Override.Value",
            hint: "ARTICHRON.ItemProperty.Damage.Override.ValueHint"
          })
        }),
        parts: new ArrayField(new SchemaField({
          id: new IdField(),
          formula: new StringField({
            required: true,
            label: "ARTICHRON.ItemProperty.Damage.Parts.Formula",
            hint: "ARTICHRON.ItemProperty.Damage.Parts.FormulaHint"
          }),
          type: new StringField({
            choices: CONFIG.SYSTEM.DAMAGE_TYPES,
            label: "ARTICHRON.ItemProperty.Damage.Parts.Type",
            hint: "ARTICHRON.ItemProperty.Damage.parts.TypeHint"
          })
        }))
      })
    };
  }

  /** @override */
  static get BONUS_FIELDS() {
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
