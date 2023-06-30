import {SYSTEM} from "../../../helpers/config.mjs";
import {BaseItemModel} from "../item/item-base.mjs";

export const arsenalFields = () => {
  const fields = {};
  for (const key of ["primary", "secondary", "ammo"]) {
    fields[key] = new foundry.data.fields.ForeignDocumentField(BaseItemModel, {idOnly: true, nullable: true});
  }
  return fields;
}

export const armorFields = () => {
  const fields = {};
  for (const key in SYSTEM.ARMOR_TYPES) {
    fields[key] = new foundry.data.fields.ForeignDocumentField(BaseItemModel, {idOnly: true, nullable: true});
  }
  return fields;
}
