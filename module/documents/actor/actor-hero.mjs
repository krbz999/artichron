import {PoolDiceModel} from "../fields/die.mjs";
import {SkillField} from "../fields/skill-field.mjs";
import {ActorSystemModel} from "./system-model.mjs";

const {EmbeddedDataField, SchemaField, SetField, StringField} = foundry.data.fields;

export default class HeroData extends ActorSystemModel {
  /** @override */
  static defineSchema() {
    const schema = super.defineSchema();

    schema.pools = new SchemaField({
      health: new EmbeddedDataField(PoolDiceModel),
      stamina: new EmbeddedDataField(PoolDiceModel),
      mana: new EmbeddedDataField(PoolDiceModel)
    });

    schema.traits = new SchemaField({
      pool: new StringField({required: true, initial: "health", choices: ["health", "stamina", "mana"]}) // TODO
    });

    schema.equipped = new SchemaField({
      arsenal: new SchemaField({
        primary: new StringField({required: true}),
        secondary: new StringField({required: true})
      }),
      armor: new SchemaField(Object.keys(CONFIG.SYSTEM.EQUIPMENT_TYPES).reduce((acc, key) => {
        acc[key] = new StringField({required: true});
        return acc;
      }, {})),
      ammo: new SetField(new StringField({required: true}))
    });

    schema.skills = new SchemaField(Object.keys(CONFIG.SYSTEM.SKILLS).reduce((acc, skill) => {
      acc[skill] = new SkillField(skill);
      return acc;
    }, {}));

    return schema;
  }

  /* -------------------------------------------------- */
  /*   Preparation methods                              */
  /* -------------------------------------------------- */

  /** @override */
  prepareBaseData() {
    super.prepareBaseData();

    // Set 'faces' of each pool.
    for (const [k, v] of Object.entries(this.pools)) {
      v.faces = (k === this.traits.pool) ? 6 : 4;
    }

    // Set health maximum and clamp current health.
    const injury = 1 - this.parent.appliedConditionLevel("injured") / 100;
    this.health.max = Math.ceil(10 * this.pools.health.max * this.pools.health.faces * injury);
    this.health.value = Math.clamp(this.health.value, 0, this.health.max);
    this.health.pct = Math.round(this.health.value / this.health.max * 100);
  }

  /* -------------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    const rollData = this.parent.getRollData();
    this._preparePools(rollData);
    this._prepareEquipped();
    this._prepareEncumbrance();
    this._prepareArmor(rollData);
    this._prepareResistances(rollData);
  }

  /* -------------------------------------------------- */

  /** Prepare pools. */
  _preparePools(rollData) {
    Object.entries(this.pools).forEach(([k, v]) => v.prepareDerivedData(rollData));
  }

  /* -------------------------------------------------- */

  /** Prepare equipped items. */
  _prepareEquipped() {
    const {arsenal, armor} = this.equipped;

    if (arsenal.primary?.isTwoHanded || arsenal.secondary?.isTwoHanded) arsenal.secondary = null;

    for (const [key, item] of Object.entries(armor)) {
      if (!item) continue;
      armor[key] = ((item.type === "armor") && (item.system.category.subtype === key)) ? item : null;
    }

    this.equipped.ammo = this.equipped.ammo.reduce((acc, id) => {
      const item = this.parent.items.get(id);
      if (item && item.isAmmo) acc.add(item);
      return acc;
    }, new Set());
  }

  /* -------------------------------------------------- */

  /** Prepare current and max encumbrance. */
  _prepareEncumbrance() {
    const dice = this.pools.stamina;
    this.encumbrance = {};
    this.encumbrance.max = dice.max * dice.faces;
    this.encumbrance.value = this.parent.items.reduce((acc, item) => {
      return acc + item.system.weight.total;
    }, 0);
  }

  /* -------------------------------------------------- */

  /** Prepare armor value. */
  _prepareArmor(rollData) {
    const armor = this.defenses.armor;
    armor.value = Object.values({...this.parent.armor, ...this.parent.arsenal}).reduce((acc, item) => {
      let v = item?.system.armor?.value ?? 0;
      if (v) v = artichron.utils.simplifyBonus(v, item.getRollData());
      else v = 0;
      return acc + v;
    }, artichron.utils.simplifyBonus(armor.value, rollData));
  }

  /* -------------------------------------------------- */

  /** Prepare the value of actor resistances. */
  _prepareResistances(rollData) {
    const armors = Object.values(this.parent.armor).reduce((acc, w) => {
      if (w) acc.push([w, w.getRollData()]);
      return acc;
    }, []);

    for (const [k, v] of Object.entries(this.resistances)) {
      let total = artichron.utils.simplifyBonus(v.value, rollData);
      for (const [item, rollData] of armors) {
        total += artichron.utils.simplifyBonus(item.system.resistances[k].value, rollData);
      }
      v.value = total;
    }
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  static get BONUS_FIELDS() {
    const bonus = super.BONUS_FIELDS;

    // Pools
    for (const k of ["health", "mana", "stamina"]) {
      bonus.add(`system.pools.${k}.max`);
      bonus.add(`system.pools.${k}.faces`);
    }

    // Skills
    for (const k of Object.keys(this.skills)) {
      bonus.add(`system.skills.${k}.value`);
    }

    return bonus;
  }

  /* -------------------------------------------------- */

  /**
   * The currently equipped ammunition.
   * @type {Set<ItemArtichron>}
   */
  get ammo() {
    return this.equipped.ammo;
  }

  /* -------------------------------------------------- */

  /**
   * The currently equipped arsenal.
   * @type {{primary: ItemArtichron, secondary: ItemArtichron}}
   */
  get arsenal() {
    const items = this.equipped.arsenal;
    return {
      primary: this.parent.items.get(items.primary) ?? null,
      secondary: this.parent.items.get(items.secondary) ?? null
    };
  }

  /* -------------------------------------------------- */

  /**
   * The currently equipped armor set.
   * @type {object}
   */
  get armor() {
    const items = this.equipped.armor;
    return Object.keys(CONFIG.SYSTEM.EQUIPMENT_TYPES).reduce((acc, k) => {
      acc[k] = this.parent.items.get(items[k]) ?? null;
      return acc;
    }, {});
  }

  /* -------------------------------------------------- */

  /**
   * Does this actor have a shield equipped?
   * @type {boolean}
   */
  get hasShield() {
    return (this.equipped.arsenal.primary?.type === "shield")
      || (this.equipped.arsenal.secondary?.type === "shield");
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Fully restore any resources.
   * @returns {Promise<ActorArtichron>}
   */
  async recover() {
    const update = {};
    update["system.health.value"] = this.health.max;

    // Pools.
    for (const k of ["health", "stamina", "mana"]) {
      update[`system.pools.${k}.value`] = Math.max(this.pools[k].value, this.pools[k].max);
    }

    return this.parent.update(update);
  }
}
