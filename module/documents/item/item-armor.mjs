import {ResistanceField} from "../fields/resistance-field.mjs";
import ItemSystemModel from "./system-model.mjs";
import {FusionTemplateMixin} from "./templates/fusion-data.mjs";

const {NumberField, SchemaField, StringField} = foundry.data.fields;

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
      resistances: new ResistanceField(),
      armor: new SchemaField({
        value: new NumberField({min: 0, integer: true})
      }),
      category: new SchemaField({
        subtype: new StringField({
          label: "ARTICHRON.ItemProperty.Category.SubtypeArmor",
          hint: "ARTICHRON.ItemProperty.Category.SubtypeArmorHint",
          choices: CONFIG.SYSTEM.EQUIPMENT_TYPES
        })
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
}
