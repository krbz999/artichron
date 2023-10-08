// Base model for items that are held (weapons, shields, spells).
import {DamageField} from "../fields/damage.mjs";
import {DefenseDie} from "../fields/die.mjs";
import {BaseItemModel} from "./_item-base.mjs";

export default class ArsenalData extends BaseItemModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      damage: new foundry.data.fields.ArrayField(new DamageField()),
      defenses: new foundry.data.fields.SchemaField({
        parry: new foundry.data.fields.EmbeddedDataField(DefenseDie),
        block: new foundry.data.fields.EmbeddedDataField(DefenseDie)
      }),
      wield: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({choices: [1, 2], initial: 1}),
        type: new foundry.data.fields.StringField({choices: ["melee", "ranged"]}),
        range: new foundry.data.fields.NumberField({integer: true, required: true, initial: null})
      }),
      fusion: new foundry.data.fields.SchemaField({
        item: new foundry.data.fields.ForeignDocumentField(ArsenalData, {idOnly: true}),
        granted: new foundry.data.fields.StringField() // placeholder, ideally derived.
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

  /** Is this one- or two-handed, melee or ranged? */
  get isOneHanded() {
    return this.wield.value === 1;
  }
  get isTwoHanded() {
    return this.wield.value === 2;
  }
  get isMelee() {
    return this.wield.type === "melee";
  }
  get isRanged() {
    return this.wield.type === "ranged";
  }
}
