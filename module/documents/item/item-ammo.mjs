import ItemSystemModel from "./system-model.mjs";
import DamageTemplateMixin from "./templates/damage-data.mjs";

const {SchemaField, StringField, NumberField, ArrayField} = foundry.data.fields;

export default class AmmunitionData extends ItemSystemModel.mixin(DamageTemplateMixin) {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").ItemSystemModelMetadata}
   */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    defaultWeight: 0.1,
    inventorySection: "consumables",
    order: 60,
    type: "ammo"
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      quantity: new SchemaField({
        value: new NumberField({initial: 1, min: 0, integer: true, nullable: false})
      }),
      category: new SchemaField({
        subtype: new StringField({
          required: true,
          initial: () => Object.keys(CONFIG.SYSTEM.AMMUNITION_TYPES)[0],
          choices: CONFIG.SYSTEM.AMMUNITION_TYPES
        })
      }),
      range: new SchemaField({
        value: new NumberField({integer: true, initial: null})
      }),
      blast: new SchemaField({
        size: new NumberField({integer: true, min: 1, nullable: true}),
        type: new StringField({
          required: true,
          blank: true,
          choices: Object.entries(CONFIG.SYSTEM.AREA_TARGET_TYPES).reduce((acc, [k, v]) => {
            return v.ammo ? Object.assign(acc, {[k]: v}) : acc;
          }, {})
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
            }
          }),
          value: new StringField({
            required: true,
            blank: true,
            choices: CONFIG.SYSTEM.DAMAGE_TYPES
          })
        }),
        parts: new ArrayField(new SchemaField({
          id: new StringField({
            initial: () => foundry.utils.randomID(),
            validate: value => foundry.data.validators.isValidId(value),
            readonly: true,
            required: true
          }),
          formula: new StringField({required: true}),
          type: new StringField({choices: CONFIG.SYSTEM.DAMAGE_TYPES})
        }))
      })
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  static get BONUS_FIELDS() {
    const fields = super.BONUS_FIELDS;
    fields.add("system.range.value").add("system.damage.parts");
    return fields;
  }

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ItemProperty.AmmoProperty"
  ];

  /* -------------------------------------------------- */

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
