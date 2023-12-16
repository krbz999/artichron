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

  /**
   * Does this actor have a shield equipped?
   * @type {boolean}
   */
  get hasShield() {
    return this.system.hasShield ?? false;
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
    const rollData = this.getRollData();
    this._prepareArmor(rollData);
    this._prepareDefenses();
    this._prepareResistances(rollData);
  }

  /** Prepare armor value. */
  _prepareArmor(rollData) {
    const armor = this.system.defenses.armor;
    armor.total = artichron.utils.simplifyFormula(armor.bonus, rollData);
    Object.values({...this.armor, ...this.arsenal}).forEach(item => armor.total += (item?.system.armor?.value ?? 0));
  }

  /** Prepare block and parry. */
  _prepareDefenses() {
    const def = this.system.defenses;
    const items = Object.values(this.arsenal);
    ["parry", "block"].forEach(k => {
      def[k].rolls = items.reduce((acc, item) => {
        const r = item?.system[k].formula;
        if (r) acc.push(r);
        return acc;
      }, []);
    });
  }

  /** Prepare the value of actor resistances. */
  _prepareResistances(rollData) {
    const res = this.system.resistances;
    Object.keys(res).forEach(k => res[k].total = artichron.utils.simplifyFormula(res[k].bonus, rollData));

    // Add all armor items' bonuses to resistances.
    Object.values(this.armor).forEach(w => {
      const ir = w?.system.resistances ?? [];
      ir.forEach(({type, value}) => {
        if (type in res) res[type].total += value;
      });
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

  /** @override */
  async _preCreate(data, options, userId) {
    if ((await super._preCreate(data, options, userId)) === false) return false;

    const isHero = this.type === "hero";
    const tokenData = {
      sight: {enabled: true},
      actorLink: isHero,
      disposition: CONST.TOKEN_DISPOSITIONS[isHero ? "FRIENDLY" : "HOSTILE"],
      displayName: CONST.TOKEN_DISPLAY_MODES[isHero ? "HOVER" : "OWNER_HOVER"],
      displayBars: CONST.TOKEN_DISPLAY_MODES[isHero ? "HOVER" : "OWNER_HOVER"]
    };
    this.updateSource({prototypeToken: tokenData});
  }

  /**
   * Display scrolling damage numbers on each of this actor's tokens.
   * @param {object} damages      An object of damage/healing types to their values.
   * @returns {Promise<void>}
   */
  async _displayScrollingNumbers(damages) {
    if (!damages) return;
    const tokens = this.isToken ? [this.token?.object] : this.getActiveTokens(true);
    const options = {
      duration: 3000,
      anchor: CONST.TEXT_ANCHOR_POINTS.TOP,
      stroke: 0x000000,
      strokeThickness: 4,
      jitter: 2
    };

    for (const t of tokens) {
      if (!t.visible) continue;
      for (const type in damages) {
        const config = (type in CONFIG.SYSTEM.HEALING_TYPES) ? CONFIG.SYSTEM.HEALING_TYPES : CONFIG.SYSTEM.DAMAGE_TYPES;
        canvas.interface.createScrollingText(t.center, damages[type].signedString(), {
          ...options, fill: config[type].color
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

    // RollData of equipped items.
    delete data.equipped;
    for (const e of ["arsenal", "armor"]) {
      data[e] = {};
      const items = this[e];
      Object.entries(items).forEach(([key, item]) => data[e][key] = {...items[key]?.system ?? {}});
    }
    return data;
  }

  /**
   * Apply damage to this actor.
   * @param {object} values         An object with keys from DAMAGE_TYPES or HEALING_TYPES.
   * @returns {Promise<Actor>}      The actor after the update.
   */
  async applyDamage(values = {}) {
    const resistances = this.system.resistances;
    const armor = this.system.defenses.armor;
    const types = {...CONFIG.SYSTEM.DAMAGE_TYPES, ...CONFIG.SYSTEM.HEALING_TYPES};

    const indivs = {};
    const amount = Math.round(Object.entries(values).reduce((acc, [type, value]) => {
      if (!(type in types)) return acc;

      // Is this damage type resisted?
      if (types[type].resist) value -= Math.max(resistances[type].total, 0);

      // Is this damage type reduced by armor?
      if (types[type].armor) value -= armor.total;

      if (type in CONFIG.SYSTEM.HEALING_TYPES) {
        indivs[type] = value;
      } else {
        value = Math.max(value, 0);
        if (value) indivs[type] = -value;
      }
      return acc + value;
    }, 0));
    const hp = this.system.health;
    const val = Math.clamped(hp.value - amount, 0, hp.max);
    return this.update({"system.health.value": val}, {damages: indivs});
  }

  /**
   * Roll one or more dice from a pool.
   * @param {string} type               The type of pool dice to roll (health, stamina, mana).
   * @param {number} amount             The amount of dice to roll.
   * @param {boolean} message           Whether to create a chat message.
   * @param {PointerEvent} event        An associated click event.
   * @returns {Promise<Roll|null>}      The created Roll instance.
   */
  async rollPool(type, {amount = null, message = true, event} = {}) {
    if (!(type in this.system.pools)) return null;
    const pool = this.system.pools[type];
    if (!pool.value || (pool.value < amount)) {
      ui.notifications.warn(game.i18n.format("ARTICHRON.NotEnoughPoolDice", {
        name: this.name,
        type: game.i18n.localize(`ARTICHRON.${type.capitalize()}`)
      }));
      return null;
    }

    if (type === "health") {
      const hp = this.system.health;
      if (hp.value >= hp.max) {
        ui.notifications.warn(game.i18n.format("ARTICHRON.AlreadyAtMaxHealth", {name: this.name}));
        return null;
      }
    }

    const update = {};
    const updateOptions = {pool: type};
    const actor = this;

    if (event.shiftKey) amount ??= 1;
    else amount = await Dialog.wait({
      content: await renderTemplate("systems/artichron/templates/chat/pool-roll.hbs", {
        initial: amount,
        label: `ARTICHRON.${type.capitalize()}DiePl`,
        max: actor.system.pools[type].max
      }),
      title: game.i18n.format("ARTICHRON.PoolRoll", {
        type: game.i18n.localize(`ARTICHRON.${type.capitalize()}`),
        name: actor.name
      }),
      buttons: {
        confirm: {
          label: game.i18n.localize("ARTICHRON.Roll"),
          callback: (html) => new FormDataExtended(html[0].querySelector("FORM")).object.value || 1,
          icon: "<i class='fa-solid fa-check'></i>"
        }
      },
      render: ([html]) => {
        html.querySelector("INPUT").addEventListener("focus", event => event.currentTarget.select());
        html.querySelector("INPUT").addEventListener("change", function(event) {
          const pool = actor.system.pools[type];
          const value = event.currentTarget.value;
          if (Number.isNumeric(value)) event.currentTarget.value = Math.clamped(value, 0, pool.value);
        });
      }
    }, {classes: ["dialog", "artichron"]});
    if (!amount) return null;

    const roll = await new Roll(pool.formula).alter(1, amount - 1).evaluate();
    update[`system.pools.${type}.value`] = pool.value - amount;
    if (message) {
      const dice = game.i18n.localize(`ARTICHRON.${type.capitalize()}DiePl`);
      roll.toMessage({
        speaker: ChatMessage.implementation.getSpeaker({actor: this}),
        flavor: `${this.name} ${dice}`,
        "flags.artichron.roll.type": type
      });
    }

    // Apply healing.
    if (type === "health") {
      const hp = this.system.health;
      update["system.health.value"] = Math.clamped(hp.value + roll.total, 0, hp.max);
      updateOptions.damages = {healing: Math.abs(update["system.health.value"] - hp.value)};
    }
    await this.update(update, updateOptions);
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

  /**
   * Roll parry or defense.
   * @param {object} [options={}]     Options to modify the roll.
   */
  async rollDefense(options = {}) {
    const formula = this.system.defenses.parry.rolls.concat(this.system.defenses.block.rolls).filterJoin(" + ");
    const data = this.getRollData();
    return new Roll(formula, data).toMessage({
      speaker: ChatMessage.implementation.getSpeaker({actor: this}),
      flavor: "Defense Roll whee"
    });
  }

  /**
   * Restore health and pools to maximums.
   * @returns {Promise<ActorArtichron>}
   */
  async recover() {
    const {health, pools} = this.system;
    const updates = {};

    // Restore health.
    updates["system.health.value"] = health.max;

    // Restore pools.
    Object.keys(pools).forEach(key => updates[`system.pools.${key}.value`] = Math.max(pools[key].value, pools[key].max));

    return this.update(updates);
  }
}
