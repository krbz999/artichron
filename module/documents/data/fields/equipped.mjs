import {SYSTEM} from "../../../helpers/config.mjs";
import {BaseItemModel} from "../item/item-base.mjs";

export const EquippedField = () => {
  const types = {primary: "weapon", secondary: "weapon", ammo: "ammo", ...SYSTEM.ARMOR_TYPES};
  const fields = Object.entries(types).reduce((acc, [key, type]) => {
    acc[key] = new foundry.data.fields.ForeignDocumentField(BaseItemModel, {type, idOnly: true, nullable: true});
    return acc;
  }, {});
  return {equipped: new foundry.data.fields.SchemaField(fields)};
}
