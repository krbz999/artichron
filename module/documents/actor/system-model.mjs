import DefenseModel from "../fields/defense.mjs";
import {PoolDie} from "../fields/die.mjs";
import ResistanceModel from "../fields/resistance.mjs";
import {SYSTEM} from "../../helpers/config.mjs";
import {LocalIdField} from "../fields/local-id.mjs";

export class ActorSystemModel extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      health: new fields.SchemaField({
        value: new fields.NumberField({min: 0, integer: true}),
        max: new fields.NumberField({min: 0, integer: true})
      }),
      pools: new fields.SchemaField({
        health: new fields.EmbeddedDataField(PoolDie),
        stamina: new fields.EmbeddedDataField(PoolDie),
        mana: new fields.EmbeddedDataField(PoolDie)
      }),
      equipped: new fields.SchemaField({
        arsenal: new fields.SchemaField({
          first: new LocalIdField(),
          second: new LocalIdField()
        }),
        armor: new fields.SchemaField(Object.keys(SYSTEM.ARMOR_TYPES).reduce((acc, key) => {
          acc[key] = new LocalIdField();
          return acc;
        }, {})),
        ammo: new fields.SetField(new LocalIdField()),
        favorites: new fields.SetField(new LocalIdField())
      }),
      resistances: new fields.SchemaField(Object.entries(SYSTEM.DAMAGE_TYPES).reduce((acc, [key, data]) => {
        if (data.resist) acc[key] = new fields.EmbeddedDataField(ResistanceModel);
        return acc;
      }, {})),
      defenses: new foundry.data.fields.SchemaField(Object.keys(SYSTEM.DEFENSE_TYPES).reduce((acc, key) => {
        acc[key] = new fields.EmbeddedDataField(DefenseModel);
        return acc;
      }, {})),
      movement: new foundry.data.fields.SchemaField({
        running: new foundry.data.fields.NumberField({min: 0, integer: true}),
        flying: new foundry.data.fields.NumberField({min: 0, integer: true}),
        swimming: new foundry.data.fields.NumberField({min: 0, integer: true})
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
  async _preUpdate(update = {}, options, user) {
    // Clamp health value to no higher than max.
    if (("health" in update) && ("value" in update.health)) {
      update.health.value = Math.min(update.health.value, update.health.max ?? this.health.max);
    }
  }

  /* ---------------------------------------- */
  /*                                          */
  /*            PREPARATION METHODS           */
  /*                                          */
  /* ---------------------------------------- */

  /** @override */
  prepareDerivedData() {
    this._prepareHealth();
    this._prepareEquipped();
  }

  /** Prepare maximum health and clamp current health. */
  _prepareHealth() {
    const dice = this.pools.health;
    this.health.max = dice.max * dice.faces;
    this.health.value = Math.min(this.health.value, this.health.max);
  }

  /** Prepare equipped items. */
  _prepareEquipped() {
    const {arsenal, armor, ammo, favorites} = this.equipped;
    for (const key in arsenal) {
      const item = this.parent.items.get(arsenal[key]);
      arsenal[key] = (item && (item.type === "arsenal")) ? item : null;
    }
    for (const key in armor) {
      const item = this.parent.items.get(armor[key]);
      armor[key] = (item && (item.type === "armor") && (item.system.type.category === key)) ? item : null;
    }
    this.equipped.ammo = ammo.reduce((acc, id) => {
      const item = this.parent.items.get(id);
      if (item && item.isAmmo) acc.add(item);
      return acc;
    }, new Set());
    this.equipped.favorites = favorites.reduce((acc, id) => {
      const item = this.parent.items.get(id);
      if (item) acc.add(item);
      return acc;
    }, new Set());
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
   * Determine whether the actor is dead.
   * @type {boolean}
   */
  get isDead() {
    const invulnerable = CONFIG.specialStatusEffects.INVULNERABLE;
    if (this.parent.statuses.has(invulnerable)) return false;
    return !this.health.value;
  }
}
