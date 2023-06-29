export default class ActorArtichron extends Actor {
  /** ----------------------------------------
   *                  GETTERS
   *  ---------------------------------------- */

  /**
   * The currently equipped ammunition.
   * @type {Item}
   */
  get ammo() {
    const item = this.items.get(this.system.equipped.ammo);
    return (!item || !item.isAmmo) ? null : item;
  }

  /**
   * The currently equipped arsenal in the primary and secondary hand.
   * @type {object}
   */
  get arsenal() {
    const primary = this.items.get(this.system.equipped.primary) ?? null;
    const secondary = this.items.get(this.system.equipped.primary) ?? null;
    const isEqual = primary === secondary;

    if (!primary) return {
      primary: null,
      secondary: (!secondary?.isOneHanded) ? null : secondary
    };
    else return {
      primary,
      secondary: (isEqual || !secondary?.isOneHanded || primary?.isTwoHanded) ? null : secondary
    };
  }

  /**
   * The currently equipped armor set.
   * @type {Item}
   */
  get armor() {
    return Object.keys(CONFIG.SYSTEM.ARMOR_TYPES).reduce((acc, key) => {
      acc[key] = this.items.get(this.system.equipped[key]) ?? null;
      return acc;
    }, {});
  }

  /**
   * Determine whether the actor is dead.
   * @type {boolean}
   */
  get isDead() {
    const invulnerable = CONFIG.specialStatusEffects.INVULNERABLE;
    if (this.parent.statuses.has(invulnerable)) return false;
    return !this.system.pools.health.value;
  }

  /** ----------------------------------------
   *        DATA PREPARATION METHODS.
   *  ---------------------------------------- */

  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded documents or derived data.
  }

  /** @override */
  prepareEmbeddedDocuments() {
    super.prepareEmbeddedDocuments(); // this calls 'this.applyActiveEffects()'.
  }

  /** @override */
  prepareDerivedData() {
    this._preparePools();
    this._prepareDefenses();
    this._prepareResistances();
    this._prepareHeroData();
    this._prepareMonsterData();
  }

  /** Prepare maximum values of pools. */
  _preparePools() {
    const data = this.getRollData();
    for (const [key, values] of Object.entries(this.system.pools)) {
      let result = 0;
      try {
        const formula = values.max || "0";
        const replaced = Roll.replaceFormulaData(formula, data, {missing: 0});
        if (Roll.validate(replaced)) result = Roll.safeEval(replaced);
      } catch (err) {
        console.warn(err);
      }
      this.system.pools[key].max = result;
    }
  }

  /** Prepare block, parry, and defense values. */
  _prepareDefenses() {
    for (const item of Object.values({...this.armor, ...this.arsenal})) {
      if (!item) continue;
      for (const type of ["armor", "block", "parry"]) {
        const object = this.system.defenses[type];
        object.items ??= 0;
        object.total ??= 0;
        object.items += (item.system.defenses[type] ?? 0);
        object.total += (item.system.defenses[type] ?? 0);
      }
    }
  }

  /** Prepare the value of actor resistances. */
  _prepareResistances() {
    const ar = this.system.resistances;

    // Set initial values of armor and total for each resistance.
    for (const key in ar) {
      ar[key].items = 0;
      ar[key].total = ar[key].value + ar[key].bonus;
    }

    // Add bonuses from each armor piece.
    for (const item of Object.values(this.armor)) {
      if (!item) continue;

      const res = item.system.resistance;
      if (res.type && (res.value > 0)) {
        ar[res.type].items += res.value;
        ar[res.type].total += res.value;
      }
    }
  }

  /** Prepare Hero type specific data. */
  _prepareHeroData() {
    if (this.type !== "hero") return;
  }

  /** Prepare NPC type specific data. */
  _prepareMonsterData() {
    if (this.type !== "monster") return;

    // Make modifications to data here. For example:
    this.system.rating = Object.values(this.system.pools).reduce((acc, {max}) => acc + max, 0);
  }

  /** ----------------------------------------
   *                UPDATE METHODS
   *  ---------------------------------------- */

  async _preUpdate(update, options, user) {
    await super._preUpdate(update, options, user);
  }

  /** ----------------------------------------
   *                ACTOR METHODS
   *  ---------------------------------------- */

  /** @override */
  getRollData() {
    const data = {...this.system};
    return data;
  }

  /**
   * Apply damage to this actor.
   * @param {object} values         An object with keys from DAMAGE_TYPES and damage values.
   * @returns {Promise<Actor>}      The actor after the update.
   */
  async applyDamage(values = {}) {
    const resistances = this.system.resistances;
    const amount = Math.round(Object.entries(values).reduce((acc, [type, value]) => {
      return acc + value * (1 - resistances[type].total);
    }, 0));
    const hp = this.system.health;
    const val = Math.clamped(hp.value - amount, 0, hp.max);
    const dhp = hp.value - val;
    return this.update({"system.health.value": val}, {dhp: -dhp});
  }
}
