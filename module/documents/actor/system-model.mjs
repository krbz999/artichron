import {DiceModel, PoolDiceModel, SkillDiceModel} from "../fields/die.mjs";
import ResistanceModel from "../fields/resistance.mjs";
import {SYSTEM} from "../../helpers/config.mjs";
import {LocalIdField} from "../fields/local-id.mjs";

const {SchemaField, NumberField, SetField, EmbeddedDataField, StringField} = foundry.data.fields;

export class ActorSystemModel extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    return {
      health: new SchemaField({
        value: new NumberField({min: 0, integer: true}),
        max: new NumberField({min: 0, integer: true})
      }),
      pools: new SchemaField({
        health: new EmbeddedDataField(PoolDiceModel),
        stamina: new EmbeddedDataField(PoolDiceModel),
        mana: new EmbeddedDataField(PoolDiceModel)
      }),
      equipped: new SchemaField({
        arsenal: new SchemaField({
          first: new LocalIdField(foundry.documents.BaseItem),
          second: new LocalIdField(foundry.documents.BaseItem)
        }),
        armor: new SchemaField(Object.keys(SYSTEM.ARMOR_TYPES).reduce((acc, key) => {
          acc[key] = new LocalIdField(foundry.documents.BaseItem);
          return acc;
        }, {})),
        ammo: new SetField(new LocalIdField(foundry.documents.BaseItem, {idOnly: true})),
        favorites: new SetField(new LocalIdField(foundry.documents.BaseItem, {idOnly: true}))
      }),
      resistances: new SchemaField(Object.entries(SYSTEM.DAMAGE_TYPES).reduce((acc, [key, data]) => {
        if (data.resist) acc[key] = new EmbeddedDataField(ResistanceModel);
        return acc;
      }, {})),
      defenses: new SchemaField(Object.keys(SYSTEM.DEFENSE_TYPES).reduce((acc, key) => {
        acc[key] = new EmbeddedDataField(DiceModel);
        return acc;
      }, {})),
      movement: new SchemaField({
        running: new NumberField({min: 0, integer: true}),
        flying: new NumberField({min: 0, integer: true}),
        swimming: new NumberField({min: 0, integer: true})
      }),
      skills: new SchemaField({
        head: new EmbeddedDataField(SkillDiceModel),
        arms: new EmbeddedDataField(SkillDiceModel),
        legs: new EmbeddedDataField(SkillDiceModel)
      }),
      traits: new SchemaField({
        pool: new StringField({required: true, initial: "health", choices: ["health", "stamina", "mana"]})
      })
    };
  }

  /* ---------------------------------------- */
  /*                                          */
  /*              UPDATE METHODS              */
  /*                                          */
  /* ---------------------------------------- */

  /**
   * Modify the update to the system data model.
   * @param {object} update       The update to any system-specific properties.
   * @param {object} options      The update options.
   * @param {User} user           The user performing the update.
   */
  async _preUpdate(update, options, user) {}

  /* ---------------------------------------- */
  /*                                          */
  /*            PREPARATION METHODS           */
  /*                                          */
  /* ---------------------------------------- */

  /** @override */
  prepareDerivedData() {
    const rollData = this.parent.getRollData();
    this._preparePools(rollData);
    this._prepareHealth();
    this._prepareEquipped();
    this._prepareEncumbrance();
    this._prepareArmor(rollData);
    this._prepareDefenses();
    this._prepareResistances(rollData);
    this._prepareEmbeddedData(rollData);
  }

  /** Prepare pools. */
  _preparePools(rollData) {
    Object.entries(this.pools).forEach(([k, v]) => v.prepareDerivedData(rollData, k === this.traits.pool));
  }

  /** Prepare maximum health and clamp current health. */
  _prepareHealth() {
    const dice = this.pools.health;
    this.health.max = dice.max * dice.faces;
    if (this.isDiseased) this.health.max = Math.round(this.health.max / 2);
    this.health.value = Math.min(this.health.value, this.health.max);
  }

  /** Prepare equipped items. */
  _prepareEquipped() {
    const {arsenal, armor} = this.equipped;

    if (arsenal.first?.isTwoHanded || arsenal.second?.isTwoHanded) arsenal.second = null;

    for (const [key, item] of Object.entries(armor)) {
      if (!item) continue;
      armor[key] = ((item.type === "armor") && (item.system.type.category === key)) ? item : null;
    }

    this.equipped.ammo = this.equipped.ammo.reduce((acc, id) => {
      const item = this.parent.items.get(id);
      if (item && item.isAmmo) acc.add(item);
      return acc;
    }, new Set());

    this.equipped.favorites = this.equipped.favorites.reduce((acc, id) => {
      const item = this.parent.items.get(id);
      if (item) acc.add(item);
      return acc;
    }, new Set());
  }

  /** Prepare current and max encumbrance. */
  _prepareEncumbrance() {
    const dice = this.pools.stamina;
    this.encumbrance = {};
    const modifier = (this.isBuffed ? 2 : 1) * (this.isWeakened ? 0.5 : 1);
    this.encumbrance.max = Math.round(dice.max * dice.faces * modifier);
    this.encumbrance.value = this.parent.items.reduce((acc, item) => {
      return acc + (item.system.weight?.value ?? 0) * (item.system.quantity?.value ?? 1);
    }, 0);
  }

  /** Prepare armor value. */
  _prepareArmor(rollData) {
    const armor = this.defenses.armor;
    armor.total = artichron.utils.simplifyBonus(armor.bonus, rollData);
    Object.values({...this.parent.armor, ...this.parent.arsenal}).forEach(item => {
      armor.total += (item?.system.armor?.value ?? 0);
    });
  }

  /** Prepare block and parry. */
  _prepareDefenses() {
    const def = this.defenses;
    const items = Object.values(this.parent.arsenal);
    ["parry", "block"].forEach(k => {
      def[k].rolls = items.reduce((acc, item) => {
        const r = item?.system[k]?.formula;
        if (r) acc.push(r);
        return acc;
      }, []);
    });
  }

  /** Prepare the value of actor resistances. */
  _prepareResistances(rollData) {
    const res = this.resistances;
    Object.keys(res).forEach(k => res[k].total = artichron.utils.simplifyBonus(res[k].bonus, rollData));

    // Add all armor items' bonuses to resistances.
    Object.values(this.parent.armor).forEach(w => {
      const ir = w?.system.resistances ?? [];
      ir.forEach(({type, value}) => {
        if (type in res) res[type].total += value;
      });
    });

    if (this.isBurning) res.fire.total += 1;
  }

  /** Prepare any embedded models. */
  _prepareEmbeddedData(rollData) {
    Object.values(this.defenses).forEach(v => v.prepareDerivedData(rollData));
    Object.values(this.skills).forEach(v => v.prepareDerivedData(rollData));
  }

  /* ---------------------------------------- */
  /*                                          */
  /*                  GETTERS                 */
  /*                                          */
  /* ---------------------------------------- */

  /**
   * The currently equipped ammunition.
   * @type {Set<Item>}
   */
  get ammo() {
    return this.equipped.ammo;
  }

  /**
   * The currently equipped arsenal.
   * @type {object}
   */
  get arsenal() {
    return this.equipped.arsenal;
  }

  /**
   * The currently equipped armor set.
   * @type {object}
   */
  get armor() {
    return this.equipped.armor;
  }

  /**
   * Determine whether the actor is bleeding.
   * @type {boolean}
   */
  get isDiseased() {
    return this.parent.statuses.has("disease");
  }

  /**
   * Determine whether the actor is strengthened.
   * @type {boolean}
   */
  get isBuffed() {
    return this.parent.statuses.has("upgrade");
  }

  /**
   * Determine whether the actor is weakened.
   * @type {boolean}
   */
  get isWeakened() {
    return this.parent.statuses.has("downgrade");
  }

  /**
   * Determine whether the actor is burning.
   * @type {boolean}
   */
  get isBurning() {
    return this.parent.statuses.has("burning");
  }
}
