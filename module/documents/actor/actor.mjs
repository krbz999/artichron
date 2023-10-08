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
    const primary = this.items.get(this.system.equipped.arsenal.primary) ?? null;
    const secondary = this.items.get(this.system.equipped.arsenal.secondary) ?? null;
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
      acc[key] = this.items.get(this.system.equipped.armor[key]) ?? null;
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
    return !this.system.health.value;
  }

  /** ----------------------------------------
   *        DATA PREPARATION METHODS
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
    return;
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
    const def = this.system.defenses;

    // Set initial values of armor and total for each resistance.
    for (const key of ["parry", "block"]) {
      def[key].items = 0;
      def[key].total = def[key].bonus || 0;
    }
    def.armor.items = 0;
    def.armor.total = def.armor.bonus || 0;

    for (const item of Object.values(this.arsenal)) {
      if (!item) continue;
      for (const key of ["parry", "block"]) {
        def[key].items += (item.system.defenses[key].value ?? 0);
        def[key].total += (item.system.defenses[key].value ?? 0);
      }
    }
    for (const item of Object.values(this.armor)) {
      if (!item) continue;
      def.armor.items += (item.system.traits.armor.value ?? 0);
      def.armor.total += (item.system.traits.armor.value ?? 0);
    }
  }

  /** Prepare the value of actor resistances. */
  _prepareResistances() {
    const ar = this.system.resistances;

    // Set initial values of armor and total for each resistance.
    for (const key in ar) {
      ar[key].items = 0;
      ar[key].total = ar[key].bonus || 0;
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

  /** @override */
  async _preUpdate(update, options, user) {
    await super._preUpdate(update, options, user);
    this.system._validateArsenal(update);
  }

  /** @override */
  _onUpdate(update, options, user) {
    super._onUpdate(update, options, user);
    this._displayScrollingNumbers(options.damages);
  }

  _displayScrollingNumbers(damages) {
    if (!damages) return;
    const tokens = this.isToken ? [this.token?.object] : this.getActiveTokens(true);
    for (const t of tokens) {
      for (const type in damages) {
        canvas.interface.createScrollingText(t.center, damages[type].signedString(), {
          anchor: CONST.TEXT_ANCHOR_POINTS.TOP,
          fill: CONFIG.SYSTEM.DAMAGE_TYPES[type].color,
          stroke: 0x000000,
          strokeThickness: 4,
          jitter: 2
        });
      }
    }
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
    const armor = this.system.defenses.armor;
    const types = CONFIG.SYSTEM.DAMAGE_TYPES;

    const indivs = {};
    const amount = Math.round(Object.entries(values).reduce((acc, [type, value]) => {
      if (!(type in types)) return acc;

      // Is this damage type resisted?
      if (types[type].resist) value -= Math.max(resistances[type].total, 0);

      // Is this damage type reduced by armor?
      if (types[type].armor) value -= armor.total;

      value = Math.max(value, 0);
      if (value) indivs[type] = -value;
      return acc + value;
    }, 0));
    const hp = this.system.health;
    const val = Math.clamped(hp.value - amount, 0, hp.max);
    return this.update({"system.health.value": val}, {damages: indivs});
  }

  /**
   * Roll one or more dice from a pool.
   * @param {string} type         The type of pool dice to roll (health, stamina, mana).
   * @param {number} amount       The amount of dice to roll.
   * @param {boolean} message     Whether to create a chat message.
   * @returns {Promise<Roll>}     The created Roll instance.
   */
  async rollPool(type, {amount = 1, message = true} = {}) {
    if (!(type in this.system.pools)) return null;
    const pool = this.system.pools[type];
    if (pool.value < amount) {
      ui.notifications.warn(game.i18n.format("ARTICHRON.NotEnoughPoolDice", {
        name: this.name,
        type: game.i18n.localize(`ARTICHRON.${type.capitalize()}`)
      }));
      return null;
    }

    const roll = await new Roll(pool.formula).alter(1, amount - 1).evaluate();
    await this.update({[`system.pools.${type}.value`]: pool.value - amount});
    if (message) {
      const dice = game.i18n.localize(`ARTICHRON.${type.capitalize()}DiePl`);
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({actor: this}),
        flavor: `${this.name} ${dice}`,
        "flags.artichron.roll.type": type
      });
    }
    return roll;
  }
}
