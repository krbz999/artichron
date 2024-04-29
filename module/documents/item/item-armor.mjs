import {SYSTEM} from "../../helpers/config.mjs";
import {ArmorField} from "../fields/armor-field.mjs";
import {IdentifierField} from "../fields/identifier.mjs";
import {ResistanceField} from "../fields/resistance-field.mjs";
import {ItemSystemModel} from "./system-model.mjs";

export default class ArmorData extends ItemSystemModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      identifier: new IdentifierField(),
      resistances: new ResistanceField(),
      armor: new ArmorField()
    };
  }

  /** @override */
  get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "system.armor.value",
      ...Object.entries(SYSTEM.DAMAGE_TYPES).reduce((acc, [k, v]) => {
        if (v.resist) acc.push(`system.resistances.${k}.value`);
        return acc;
      }, [])
    ]));
  }
}
