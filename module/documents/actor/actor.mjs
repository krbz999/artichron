export default class ActorArtichron extends Actor {
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
    return this.system.equipped.ammo;
  }

  /**
   * The currently equipped arsenal.
   * @type {object}
   */
  get arsenal() {
    return this.system.equipped.arsenal;
  }

  /**
   * The currently equipped armor set.
   * @type {object}
   */
  get armor() {
    return this.system.equipped.armor;
  }

  /**
   * Determine whether the actor is dead.
   * @type {boolean}
   */
  get isDead() {
    return this.system.isDead ?? false;
  }

  /* ---------------------------------------- */
  /*                                          */
  /*            PREPARATION METHODS           */
  /*                                          */
  /* ---------------------------------------- */

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
    super.prepareBaseData();
  }

  /** @override */
  prepareEmbeddedDocuments() {
    super.prepareEmbeddedDocuments(); // this calls 'this.applyActiveEffects()'.
  }

  /** @override */
  prepareDerivedData() {
    this._prepareDefenses();
    this._prepareResistances();
  }

  /** Prepare block, parry, and defense values. */
  _prepareDefenses() {
    const def = this.system.defenses;
    const items = Object.values({...this.armor, ...this.arsenal});
    ["parry", "block", "armor"].forEach(k => {
      def[k].total = items.reduce((acc, item) => acc + (item?.system[k]?.value ?? 0), def[k].bonus);
    });
  }

  /** Prepare the value of actor resistances. */
  _prepareResistances() {
    const res = this.system.resistances;
    Object.values(this.armor).forEach(w => {
      const ir = w?.system.resistances ?? [];
      for (const {type, value} of ir) {
        if (!(type in res)) continue;
        res[type].items ??= 0;
        res[type].items += value;
      }
    });
    Object.keys(res).forEach(k => {
      res[k].items ??= 0;
      res[k].total = res[k].items + res[k].bonus;
    });
  }

  /* ---------------------------------------- */
  /*                                          */
  /*               UPDATE METHODS             */
  /*                                          */
  /* ---------------------------------------- */

  /** @override */
  async _preUpdate(update, options, user) {
    await super._preUpdate(update, options, user);
    await this.system._preUpdate(update.system, options, user);
  }

  /** @override */
  _onUpdate(update, options, user) {
    super._onUpdate(update, options, user);
    this._displayScrollingNumbers(options.damages);
  }

  async _displayScrollingNumbers(damages) {
    if (!damages) return;
    const tokens = this.isToken ? [this.token?.object] : this.getActiveTokens(true);
    for (const t of tokens) {
      if (!t.visible) continue;
      for (const type in damages) {
        canvas.interface.createScrollingText(t.center, damages[type].signedString(), {
          duration: 3000,
          anchor: CONST.TEXT_ANCHOR_POINTS.TOP,
          fill: CONFIG.SYSTEM.DAMAGE_TYPES[type].color,
          stroke: 0x000000,
          strokeThickness: 4,
          jitter: 2
        });
        await new Promise(r => setTimeout(r, 200));
      }
    }
  }

  /* ----------------------------------------- */
  /*                                           */
  /*                ACTOR METHODS              */
  /*                                           */
  /*  ---------------------------------------- */

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

  /**
   * Roll damage with an equipped arsenal item.
   * @param {string} key              Arsenal to roll with, 'first' or 'second'.
   * @param {object} [options={}]     Options to modify the roll.
   */
  async rollDamage(key = null, options = {}) {
    return this.system.rollDamage(key, options);
  }
}
