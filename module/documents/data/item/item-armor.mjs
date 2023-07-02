// Base model for items that are worn (head, chest, legs).
import {SYSTEM} from "../../../helpers/config.mjs";
import {IdentifierField} from "../fields/identifier.mjs";
import {ValueField} from "../fields/value.mjs";
import {BaseItemModel} from "./item-base.mjs";

export default class ArmorData extends BaseItemModel {
  static defineSchema() {
    return {
      type: new foundry.data.fields.StringField({choices: SYSTEM.ARMOR_TYPES, label: "ARTICHRON.ArmorType"}),
      identifier: new IdentifierField({choices: SYSTEM.ARMOR_SETS, label: "ARTICHRON.SetIdentifier", nullable: true}), // the set that this is a part of.
      description: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.HTMLField({label: "ARTICHRON.DescriptionField"})
      }),
      weight: new foundry.data.fields.SchemaField({
        value: new ValueField({label: "ARTICHRON.Weight"})
      }),
      defenses: new foundry.data.fields.SchemaField({
        armor: new ValueField({label: "ARTICHRON.ArmorRating"})
      }),
      resistance: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField({label: "ARTICHRON.ResistanceBonusType"}),
        value: new ValueField({max: 3, label: "ARTICHRON.ResistanceBonusValue"})
      }),
      mobility: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField({
          choices: SYSTEM.MOVEMENT_TYPES,
          label: "ARTICHRON.MovementBonusType"
        }),
        value: new ValueField({label: "ARTICHRON.MovementBonusValue"})
      }),
      attack: new foundry.data.fields.SchemaField({
        value: new ValueField({label: "ARTICHRON.AttackBonus"})
      })
    };
  }

  /* -------------------------------- */

  // model specific getters go here. The item itself should have the same getters, but just return `this.system.<getter> ?? false`.


  get exampleGetter() {
    return true;
  }
}
