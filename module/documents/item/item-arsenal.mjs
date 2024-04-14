import {DamageModel} from "../fields/damage.mjs";
import {ItemSystemModel} from "./system-model.mjs";

const {ArrayField, NumberField, SchemaField, StringField, EmbeddedDataField} = foundry.data.fields;

export default class ArsenalData extends ItemSystemModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      damage: new ArrayField(new EmbeddedDataField(DamageModel)),
      wield: new SchemaField({
        value: new NumberField({choices: [1, 2], initial: 1}),
        range: new NumberField({integer: true, min: 0})
      })
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    const rollData = this.parent.getRollData();
    this.damage.forEach(v => v.prepareDerivedData(rollData));
  }

  /** @override */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "wield.range",
      "cost.value"
    ]));
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
  get isShield() {
    return this.type.category === "shield";
  }
}
