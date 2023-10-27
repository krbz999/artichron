import DamageField from "../fields/damage.mjs";
import {DefenseDie} from "../fields/die.mjs";
import {ItemSystemModel} from "./system-model.mjs";

export default class ArsenalData extends ItemSystemModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      damage: new fields.ArrayField(new fields.EmbeddedDataField(DamageField)),
      parry: new fields.EmbeddedDataField(DefenseDie),
      block: new fields.EmbeddedDataField(DefenseDie),
      wield: new fields.SchemaField({
        value: new fields.NumberField({choices: [1, 2], initial: 1}),
        range: new fields.NumberField({integer: true, required: true, initial: null})
      }),
      fusion: new fields.SchemaField({
        item: new fields.ForeignDocumentField(ArsenalData, {idOnly: true}),
        granted: new fields.StringField() // placeholder, ideally derived.
      }),
      armor: new fields.SchemaField({
        value: new fields.NumberField({integer: true, required: true, initial: null})
      }),
      cost: new fields.SchemaField({
        value: new fields.NumberField({integer: true, required: true, initial: null}),
        type: new fields.StringField({choices: ["health", "stamina", "mana"]})
      })
    };
  }

  /**
   * Is this one- or two-handed, melee or ranged?
   * @type {boolean}
   */
  get isOneHanded() {
    return this.wield.value === 1;
  }
  get isTwoHanded() {
    return this.wield.value === 2;
  }
  get isMelee() {
    return this.type.category === "melee";
  }
  get isRanged() {
    return this.type.category === "ranged";
  }
  get isSpell() {
    return this.type.category === "spell";
  }
  get isShield() {
    return this.type.category === "shield";
  }
}
