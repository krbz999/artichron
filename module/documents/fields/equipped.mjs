import {SYSTEM} from "../../helpers/config.mjs";
import {BaseItemModel} from "../item/_item-base.mjs";

export const arsenalFields = (arms) => {
  arms = Math.clamped(arms, 1, 4) || 2;
  const keys = Array.fromRange(arms, 1).map(n => ({
    1: "primary",
    2: "secondary",
    3: "tertiary",
    4: "quaternary"
  }[n]));

  const fields = {};
  for (const key of [...keys, "ammo"]) {
    fields[key] = new foundry.data.fields.ForeignDocumentField(BaseItemModel, {
      idOnly: true,
      nullable: true,
      label: `ARTICHRON.Arsenal${key.capitalize()}`
    });
  }
  return fields;
}

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
