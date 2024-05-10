import {FormulaField} from "../fields/formula-field.mjs";
import {ResistanceField} from "../fields/resistance-field.mjs";
import {ItemSystemModel} from "./system-model.mjs";
import {FusionTemplateMixin} from "./templates/fusion-data.mjs";

const {SchemaField} = foundry.data.fields;

export default class ArmorData extends FusionTemplateMixin(ItemSystemModel) {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      resistances: new ResistanceField(),
      armor: new SchemaField({
        value: new FormulaField({required: true, label: "ARTICHRON.ItemProperty.Armor"})
      })
    };
  }

  /** @override */
  get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "system.armor.value",
      ...Object.entries(CONFIG.SYSTEM.DAMAGE_TYPES).reduce((acc, [k, v]) => {
        if (v.resist) acc.push(`system.resistances.${k}.value`);
        return acc;
      }, [])
    ]));
  }
}
