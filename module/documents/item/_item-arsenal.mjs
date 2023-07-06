// Base model for items that are held (weapons, shields, spells).
import {DamageField} from "../fields/damage.mjs";
import {DefenseDieField} from "../fields/die.mjs";
import {ValueField} from "../fields/value.mjs";
import {BaseItemModel} from "./_item-base.mjs";

export default class ArsenalData extends BaseItemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      damage: new foundry.data.fields.ArrayField(new DamageField()),
      defenses: new foundry.data.fields.SchemaField({
        parry: new DefenseDieField(),
        block: new DefenseDieField()
      }),
      wield: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({choices: [1, 2], initial: 1}),
        type: new foundry.data.fields.StringField({choices: ["melee", "ranged"]}),
        range: new ValueField()
      }),
      fusion: new foundry.data.fields.SchemaField({
        item: new foundry.data.fields.ForeignDocumentField(ArsenalData, {idOnly: true}),
        granted: new foundry.data.fields.StringField() // placeholder, ideally derived.
      })
    };
  }

  static _defineTraits(){
    return {
      ...super._defineTraits(),
      armor:  new foundry.data.fields.SchemaField({
        value: new ValueField({label: "ARTICHRON.ArmorRating"})
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
