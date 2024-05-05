import {PoolDiceModel, SkillDiceModel} from "../fields/die.mjs";
import ResistanceModel from "../fields/resistance.mjs";
import {SYSTEM} from "../../helpers/config.mjs";
import {LocalIdField} from "../fields/local-id.mjs";
import {FormulaField} from "../fields/formula-field.mjs";

const {SchemaField, NumberField, SetField, EmbeddedDataField, StringField} = foundry.data.fields;

export class ActorSystemModel extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    return {
      health: new SchemaField({
        value: new NumberField({min: 0, integer: true})
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
      defenses: new SchemaField({
        armor: new SchemaField({
          value: new FormulaField({required: true})
        })
      }),
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
  async _preUpdate(update, options, user) {
    const allowed = await super._preUpdate(update, options, user);
    if (allowed === false) return false;
    const health = update.system?.health ?? {};
    if ("value" in health) health.value = Math.clamp(health.value, 0, this.health.max);
  }

  /* ---------------------------------------- */
  /*                                          */
  /*            PREPARATION METHODS           */
  /*                                          */
  /* ---------------------------------------- */

  /** @override */
  prepareBaseData() {
    super.prepareBaseData();

    // Set 'faces' of each pool.
    for (const [k, v] of Object.entries(this.pools)) {
      v.faces = (k === this.traits.pool) ? 6 : 4;
    }

    // Set health maximum and clamp current health.
    this.health.max = 10 * this.pools.health.max * this.pools.health.faces;
    this.health.value = Math.clamp(this.health.value, 0, this.health.max);
  }

  /** @override */
  prepareDerivedData() {
    const rollData = this.parent.getRollData();
    this._preparePools(rollData);
    this._prepareEquipped();
    this._prepareEncumbrance();
    this._prepareArmor(rollData);
    this._prepareResistances(rollData);
    this._prepareEmbeddedData(rollData);
  }

  /** Prepare pools. */
  _preparePools(rollData) {
    Object.entries(this.pools).forEach(([k, v]) => v.prepareDerivedData(rollData));
  }

  /** Prepare equipped items. */
  _prepareEquipped() {
    const {arsenal, armor} = this.equipped;

    if (arsenal.first?.isTwoHanded || arsenal.second?.isTwoHanded) arsenal.second = null;

    for (const [key, item] of Object.entries(armor)) {
      if (!item) continue;
      armor[key] = ((item.type === "armor") && (item.system.category.subtype === key)) ? item : null;
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
      return acc + (item.system.totalWeight);
    }, 0);
  }

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

  /** Prepare the value of actor resistances. */
  _prepareResistances(rollData) {
    const res = this.resistances;
    Object.keys(res).forEach(k => res[k].total = artichron.utils.simplifyBonus(res[k].bonus, rollData));

    // Add all armor items' bonuses to resistances.
    Object.values(this.parent.armor).forEach(w => {
      for (const [type, {value}] of Object.entries(w?.system.resistances ?? {})) {
        res[type].total += artichron.utils.simplifyBonus(value, w.getRollData());
      }
    });
  }

  /** Prepare any embedded models. */
  _prepareEmbeddedData(rollData) {
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
}
