// Base model for items that are held (weapons, shields, spells).
import {DamageField} from "../fields/damage.mjs";
import {ValueField} from "../fields/value.mjs";
import {WeightField} from "../fields/weight.mjs";
import {BaseItemModel} from "./item-base.mjs";

/**
 * Implementation of wielded items; weapons, shields, and spells.
 *
 * @property {string} type                The system subtype (eg type of weapon).
 * @property {object[]} damage            Item damage formulas, each with 'value' and 'type'.
 * @property {object} defenses            The ratings for parrying and blocking with this item.
 * @property {number} defenses.parry      The parry rating of this item.
 * @property {number} defenses.block      The block rating of this item.
 * ...
 */
export default class ArsenalData extends BaseItemModel {
  // Faces for damage dice.
  static FACES = ["d4", "d6", "d8", "d10"];
  // Subclasses must replace this.
  static SUBTYPES = null;

  static defineSchema() {
    return {
      type: new foundry.data.fields.StringField({options: this.SUBTYPES}),
      damage: new foundry.data.fields.ArrayField(new DamageField()),
      ...WeightField(),
      defenses: new foundry.data.fields.SchemaField({
        parry: new ValueField(), // not mutable, derived from subtype, dice field
        block: new ValueField(), // not mutable, also derived from subtype, dice field
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
