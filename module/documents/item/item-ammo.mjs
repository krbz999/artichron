import ItemSystemModel from "./system-model.mjs";

const {NumberField, SchemaField, StringField} = foundry.data.fields;

export default class AmmunitionData extends ItemSystemModel {
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
      override: new SchemaField({ // TODO: add this to ammo sheet and fix it up
        group: new StringField({
          required: true,
          blank: true,
          choices: {all: {label: "All"}, ...CONFIG.SYSTEM.DAMAGE_TYPE_GROUPS}
        }),
        value: new StringField({
          required: true,
          choices: CONFIG.SYSTEM.DAMAGE_TYPES,
          initial: "fire"
        })
      })
    };
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
    if (this.override.group) props.add("override");
    return props;
  }
}
