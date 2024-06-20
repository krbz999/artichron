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
    this._displayScrollingNumbers(options.damages, options.health);
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
   * @param {object} [damages]      An object of damage/healing types to their values.
   * @param {object} [health]       An object describing changes to health.
   * @returns {Promise<void>}
   */
  async _displayScrollingNumbers(damages, health) {
    if (!damages && !health) return;
    const tokens = this.isToken ? [this.token?.object] : this.getActiveTokens(true);
    const options = {
      duration: 3000,
      anchor: CONST.TEXT_ANCHOR_POINTS.TOP,
      stroke: 0x000000,
      strokeThickness: 4,
      jitter: 2
    };

    for (const t of tokens) {
      if (!t.visible || t.document.isSecret) continue;
      const c = t.center;
      damages = damages ? damages : {none: -health.delta};
      for (const [type, value] of Object.entries(damages)) {
        if (!value) continue;
        const isHeal = value < 0;
        const color = isHeal ? new Color(0x00FF00) : CONFIG.SYSTEM.DAMAGE_TYPES[type]?.color ?? new Color(0xFF0000);
        canvas.interface.createScrollingText(c, (-value).signedString(), {...options, fill: color});
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
   * @returns {Promise<ActorArtichron>}
   */
  async applyDamage(values, options = {}) {
    if (foundry.utils.getType(values) === "number") {
      values = {none: values};
    }

    values = foundry.utils.deepClone(values);

    const resistances = this.system.resistances;
    const armor = this.system.defenses.armor;
    const types = CONFIG.SYSTEM.DAMAGE_TYPES;

    // Modify values to take resistances into account.
    for (let [type, value] of Object.entries(values)) {
      if (type === "none") continue;

      // Resisted?
      if (types[type].resist) value -= resistances[type].value;

      // Reduced by armor?
      if (types[type].armor) value -= armor.value;

      if (value <= 0) delete values[type];
      else values[type] = value;
    }

    let dmg = Object.entries(values).reduce((acc, [k, v]) => acc + v, 0);
    let blocking = await this.defenseDialog(dmg);
    if (blocking === false) return this;

    for (const [type, value] of Object.entries(values)) {
      if (!blocking) break;
      const diff = Math.min(value, blocking);
      blocking -= diff;
      values[type] -= diff;
    }

    // Recalculate damage after defensive rolls.
    dmg = Object.entries(values).reduce((acc, [k, v]) => acc + v, 0);
    const hp = this.system.health;
    const val = Math.clamp(hp.value - Math.max(0, dmg), 0, hp.max);
    return this.update({"system.health.value": val}, {...options, damages: values, diff: false});
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

  /**
   * Prompt the user to roll block and parry to reduce incoming damage using any of their equipped arsenal.
   * @returns {Promise<number|false>}     A promise that resolves to the total of all defensive rolls, or false
   *                                      if the dialog was cancelled, which will be taken to mean the damage
   *                                      application should also be cancelled.
   */
  async defenseDialog(damage = null) {
    const items = Object.values(this.arsenal).filter(item => {
      return (item?.system.attributes.value.has("blocking") || item?.system.attributes.value.has("parrying"));
    });
    if (!items.length) return 0;

    // An actor requires at least 1 pip to defend.
    const inCombat = this.inCombat;
    const pips = this.actionPoints;
    if (inCombat && !pips) return 0;

    const choices = items.reduce((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});

    const field = new foundry.data.fields.SetField(new foundry.data.fields.StringField({choices: choices}), {
      label: "ARTICHRON.DefenseDialog.Items",
      hint: "ARTICHRON.DefenseDialog.ItemsHint"
    });

    const render = (event, html) => {
      if (!inCombat) return;
      const items = html.querySelector("[name=items]");
      const button = html.querySelector("[data-action=ok]");
      items.addEventListener("change", event => {
        const length = event.currentTarget.value.length;
        button.disabled = length > pips;
      });
    };

    const template = `
    ${Number.isInteger(damage) ? "<p>You are gonna take " + damage + " damage, oh no.</p>" : ""}
    <fieldset>
      <legend>{{localize "ARTICHRON.DefenseDialog.Items"}}</legend>
      <div class="form-group">
        <div class="form-fields">
          {{formInput field name="items" type="checkboxes"}}
        </div>
        <p class="hint">{{localize "ARTICHRON.DefenseDialog.ItemsHint"}}</p>
      </div>
    </fieldset>`;
    const content = Handlebars.compile(template)({field});
    const itemIds = await foundry.applications.api.DialogV2.prompt({
      content: content,
      rejectClose: false,
      modal: true,
      render: render,
      window: {
        icon: "fa-solid fa-shield",
        title: "ARTICHRON.DefenseDialog.Title"
      },
      position: {
        width: 400,
        height: "auto"
      },
      ok: {
        icon: "fa-solid fa-dice",
        label: "ARTICHRON.DefenseDialog.Confirm",
        callback: (event, button, html) => button.form.elements.items.value
      }
    });
    let value = 0;
    if (!itemIds) return false;
    for (const id of itemIds) {
      const item = this.items.get(id);
      let message;
      if ((item.type === "weapon") && item.system.attributes.value.has("parrying")) {
        message = await item.system.rollParry();
      } else if (item.system.attributes.value.has("blocking")) {
        message = await item.system.rollBlock();
      } else {
        message = await item.system.rollParry();
      }

      value += message.rolls.reduce((acc, roll) => acc + roll.total, 0);
    }

    // If in combat, remove spent pips.
    if (inCombat) await this.spendActionPoints(itemIds.length);

    return value;
  }

  /**
   * Retrieve the level of a condition effect.
   * @param {string} status
   * @returns {number}
   */
  appliedConditionLevel(status) {
    const staticId = id => {
      if (id.length >= 16) return id.substring(0, 16);
      return id.padEnd(16, "0");
    };
    const effect = this.effects.get(staticId(status));
    return effect ? effect.system.level : 0;
  }

  /* ---------------------------------------- */
  /*                                          */
  /*               Action Points              */
  /*                                          */
  /*  --------------------------------------- */

  /** @override */
  get inCombat() {
    return super.inCombat;
  }

  /**
   * This actor's current combatant.
   * @type {Combatant|null}
   */
  get combatant() {
    return game.combat?.getCombatantsByActor(this)[0] ?? null;
  }

  /**
   * Reference to this actor's combatant's current amount of pips.
   * @type {number|null}      The action points, or null if not in combat.
   */
  get actionPoints() {
    const c = this.combatant;
    return c ? c.system.pips : null;
  }

  /**
   * Adjust the remaining action points of this actor.
   * @param {number} [value]            The amount to spend. Omit to spend 1 point, use negative values to gain points.
   * @returns {Promise<Combatant>}      A promise that resolves to the updated combatant.
   */
  async spendActionPoints(value = 1) {
    const c = this.combatant;
    if (!c) throw new Error("This actor is not in combat.");
    await c.update({"system.pips": c.system.pips - value});
    return c;
  }

  /**
   * Can this actor perform an action that costs a certain amount of action points?
   * @param {number} [value]      The action point cost.
   * @returns {boolean}
   */
  canPerformActionPoints(value = 1) {
    if (!this.inCombat) return true;
    return this.actionPoints >= value;
  }
}
