import {DamageDiceModel, DefenseDiceModel} from "../fields/die.mjs";
import {ItemSystemModel} from "./system-model.mjs";

const {ArrayField, NumberField, SchemaField, StringField, EmbeddedDataField, BooleanField} = foundry.data.fields;

export default class ArsenalData extends ItemSystemModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      damage: new ArrayField(new EmbeddedDataField(DamageDiceModel)),
      parry: new EmbeddedDataField(DefenseDiceModel),
      block: new EmbeddedDataField(DefenseDiceModel),
      wield: new SchemaField({
        value: new NumberField({choices: [1, 2], initial: 1}),
        range: new NumberField({integer: true, initial: null})
      }),
      armor: new SchemaField({
        value: new NumberField({integer: true, initial: null})
      }),
      cost: new SchemaField({
        value: new NumberField({integer: true, initial: null}),
        type: new StringField({choices: ["health", "stamina", "mana"]})
      }),
      template: new SchemaField({
        type: new StringField({required: true, choices: ["circle", "cone", "ray"], initial: "cone"}),
        distance: new NumberField({integer: true, positive: true, initial: 1, nullable: false}),
        width: new NumberField({integer: true, positive: true, initial: 1, nullable: false}),
        angle: new NumberField({positive: true, min: 10, max: 360, nullable: false, initial: 30}),
        self: new BooleanField({initial: true})
      })
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    const rollData = this.parent.getRollData();
    ["parry", "block"].forEach(v => this[v].prepareDerivedData(rollData));
    this.damage.forEach(v => v.prepareDerivedData(rollData));
  }

  /** @override */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "parry.number", "parry.faces",
      "block.number", "block.faces",
      "wield.range",
      "armor.value",
      "cost.value",
      "template.distance", "template.width", "template.angle"
    ]));
  }

  async use() {
    const {first, second} = this.parent.actor.arsenal;
    const key = first === this.parent ? "first" : second === this.parent ? "second" : null;
    if (!key) {
      ui.notifications.warn("Arsenal must be equipped to be used.");
      return null;
    }

    const inCombat = this.parent.actor.inCombat;
    if (inCombat) {
      const combatant = game.combat.getCombatantByActor(this.parent.actor);
      const pips = combatant.pips;
      const cost = this.isOneHanded ? 1 : this.isTwoHanded ? 2 : 0;
      if (cost > pips) {
        ui.notifications.warn("You do not have enough pips remaining two make an attack!");
        return null;
      }

      await combatant.setFlag("artichron", "pips", pips - cost);
    }

    return this.parent.actor.rollDamage(key);
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
