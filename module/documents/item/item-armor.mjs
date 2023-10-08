// Base model for items that are worn (head, chest, legs).
import {SYSTEM} from "../../helpers/config.mjs";
import {IdentifierField} from "../fields/identifier.mjs";
import {BaseItemModel} from "./_item-base.mjs";

export default class ArmorData extends BaseItemModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      type: new foundry.data.fields.StringField({choices: SYSTEM.ARMOR_TYPES, label: "ARTICHRON.ArmorType"}),
      identifier: new IdentifierField({choices: SYSTEM.ARMOR_SETS, label: "ARTICHRON.SetIdentifier", nullable: true}),
      resistance: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField({label: "ARTICHRON.ResistanceBonusType"}),
        value: new foundry.data.fields.NumberField({
          integer: true, required: true, initial: null, label: "ARTICHRON.ResistanceBonusValue"
        })
      }),
      mobility: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField({
          choices: SYSTEM.MOVEMENT_TYPES,
          label: "ARTICHRON.MovementBonusType"
        }),
        value: new foundry.data.fields.NumberField({
          integer: true, required: true, initial: null, label: "ARTICHRON.MovementBonusValue"
        })
      }),
      attack: new foundry.data.fields.SchemaField({
        // todo: should there even be a difference between melee/ranged?
        type: new foundry.data.fields.StringField({choices: ["melee", "ranged"]}),
        value: new foundry.data.fields.NumberField({
          integer: true, required: true, initial: null, label: "ARTICHRON.AttackBonus"
        })
      })
    };
  }

  /** @override */
  static _defineTraits() {
    return {
      ...super._defineTraits(),
      armor: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({
          integer: true, required: true, initial: null, label: "ARTICHRON.ArmorRating"
        })
      })
    };
  }

  /* -------------------------------- */

  // model specific getters go here.
  // The item itself should have the same getters, but just return `this.system.<getter> ?? false`.
  get exampleGetter() {
    return true;
  }
}
