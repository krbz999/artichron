export default class ActorArtichron extends Actor {
  /* ---------------------------------------- */
  /*                  GETTERS                 */
  /* ---------------------------------------- */

  /**
   * The currently equipped ammunition.
   * @type {Set<ItemArtichron>}
   */
  get ammo() {
    return this.system.ammo ?? new Set();
  }

  /**
   * The currently equipped arsenal.
   * @type {{primary: ItemArtichron, secondary: ItemArtichron}}
   */
  get arsenal() {
    return this.system.arsenal ?? {};
  }

  /**
   * The currently equipped armor set.
   * @type {object}
   */
  get armor() {
    return this.system.armor ?? {};
  }

  /**
   * Does this actor have a shield equipped?
   * @type {boolean}
   */
  get hasShield() {
    return this.system.hasShield ?? false;
  }

  /**
   * The items that this actor has favorited.
   * @type {Set<ItemArtichron>}
   */
  get favorites() {
    return this.system.favorites;
  }

  /* ---------------------------------------- */
  /*                                          */
  /*            PREPARATION METHODS           */
  /*                                          */
  /* ---------------------------------------- */

  /** @override */
  prepareData() {
    /**
     * This calls, in order,
     * system.prepareBaseData,
     * prepareBaseData,
     * prepareEmbeddedDocuments,
     * system.prepareDerivedData,
     * prepareDerivedData
     */
    super.prepareData();
    this.items.forEach(item => item.system.preparePostData());
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded documents or derived data.
    super.prepareBaseData();
  }

  /** @override */
  prepareEmbeddedDocuments() {
    this._prepareEmbedded = true;
    super.prepareEmbeddedDocuments(); // this calls 'this.applyActiveEffects()'.
    delete this._prepareEmbedded;
  }

  /* ---------------------------------------- */
  /*                                          */
  /*               UPDATE METHODS             */
  /*                                          */
  /* ---------------------------------------- */

  /** @override */
  async _preUpdate(update, options, user) {
    // This also calls system._preUpdate.
    const allowed = await super._preUpdate(update, options, user);
    if (allowed === false) return false;
  }

  /** @override */
  _onUpdate(update, options, user) {
    super._onUpdate(update, options, user);
    this._displayScrollingNumbers(options.damages);
  }

  /** @override */
  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;

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
      if (!t.visible || !t.renderable) continue;
      for (const type in damages) {
        const config = (type in CONFIG.SYSTEM.HEALING_TYPES) ? CONFIG.SYSTEM.HEALING_TYPES : CONFIG.SYSTEM.DAMAGE_TYPES;
        canvas.interface.createScrollingText(t.center, damages[type].signedString(), {
          ...options, fill: config[type].color
        });
        await new Promise(r => setTimeout(r, 200));
      }
    }
  }

  /* ---------------------------------------- */
  /*                                          */
  /*               ACTOR METHODS              */
  /*                                          */
  /*  --------------------------------------- */

  /** @override */
  getRollData() {
    const data = this.system.getRollData();
    data.name = this.name;
    return data;
  }

  /**
   * Apply damage to this actor.
   * @param {number|object} values      An object with keys from DAMAGE_TYPES or HEALING_TYPES.
   * @returns {Promise<Actor>}          The actor after the update.
   */
  async applyDamage(values, options = {}) {
    if (foundry.utils.getType(values) === "number") {
      values = {none: values};
    }
    const resistances = this.system.resistances;
    const armor = this.system.defenses.armor;
    const types = {...CONFIG.SYSTEM.DAMAGE_TYPES, ...CONFIG.SYSTEM.HEALING_TYPES};

    const indivs = {};
    const amount = Math.round(Object.entries(values).reduce((acc, [type, value]) => {
      if (type === "none") return acc - value;

      // Is this damage type resisted?
      if (types[type].resist) value -= Math.max(resistances[type].value, 0);

      // Is this damage type reduced by armor?
      if (types[type].armor) value -= armor.value;

      if (type in CONFIG.SYSTEM.HEALING_TYPES) {
        indivs[type] = value;
      } else {
        value = Math.max(value, 0);
        if (value) indivs[type] = -value;
      }
      return acc + value;
    }, 0));
    const hp = this.system.health;
    const val = Math.clamp(hp.value - amount, 0, hp.max);
    return this.update({"system.health.value": val}, {...options, damages: indivs});
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
        ui.notifications.warn(game.i18n.format("ARTICHRON.Warning.AlreadyAtMaxHealth", {name: this.name}));
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
          if (Number.isNumeric(value)) event.currentTarget.value = Math.clamp(value, 0, pool.value);
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
      update["system.health.value"] = Math.clamp(hp.value + roll.total, 0, hp.max);
      updateOptions.damages = {healing: Math.abs(update["system.health.value"] - hp.value)};
    }
    await this.update(update, updateOptions);
    return roll;
  }

  /**
   * Roll damage with an equipped arsenal item.
   * @param {string} [key]          Arsenal to roll with, 'primary' or 'secondary'.
   * @param {object} [options]      Options to modify the roll.
   * @returns {Promise}
   */
  async rollDamage(key = null, options = {}) {
    return this.system.rollDamage(key, options);
  }

  /**
   * Roll a skill.
   * @param {string} skillId            The type of skill (head, arms, legs).
   * @param {object} [options]          Roll options.
   * @param {string} [options.pool]     The type of pool to use (health, stamina, mana). If omitted, the user is prompted.
   * @returns {Promise}
   */
  async rollSkill(skillId, options = {}) {
    const pool = options.pool ?? await foundry.applications.api.DialogV2.wait({
      buttons: ["health", "stamina", "mana"].map(pool => {
        return {
          action: pool,
          label: `ARTICHRON.Pools.${pool.capitalize()}`
        };
      }),
      rejectClose: false,
      modal: true,
      classes: ["skill"],
      window: {
        title: game.i18n.format("ARTICHRON.SkillDialog.Title", {
          skill: game.i18n.localize(`ARTICHRON.Skills.${skillId.capitalize()}`)
        }),
        icon: {
          head: "fa-solid fa-horse-head",
          arms: "fa-solid fa-hand-back-fist",
          legs: "fa-solid fa-shoe-prints"
        }[skillId]
      },
      position: {
        width: 400,
        height: "auto"
      }
    });
    if (!pool) return null;

    const formula = [this.system.skills[skillId].formula, this.system.pools[pool].formula].join(" + ");
    const rollData = this.getRollData();
    const speaker = ChatMessage.implementation.getSpeaker({actor: this});
    const rollMode = game.settings.get("core", "rollMode");
    const flavor = game.i18n.format("ARTICHRON.Skills.RollFlavor", {
      skill: game.i18n.localize(`ARTICHRON.Skills.${skillId.capitalize()}`),
      pool: game.i18n.localize(`ARTICHRON.Pools.${pool.capitalize()}`)
    });

    return new Roll(formula, rollData).toMessage({flavor, speaker}, {rollMode});
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

    await this.update(updates);
    return this;
  }
}
