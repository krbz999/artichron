import {SYSTEM} from "../../helpers/config.mjs";
import {BaseItemModel} from "../item/_item-base.mjs";

export const armorFields = () => {
  const fields = {};
  for (const key in SYSTEM.ARMOR_TYPES) {
    fields[key] = new foundry.data.fields.ForeignDocumentField(BaseItemModel, {
      idOnly: true,
      nullable: true,
      label: `ARTICHRON.Armor${key.capitalize()}`
    });
  }
  return fields;
}
