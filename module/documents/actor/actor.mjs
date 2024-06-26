export default class ActorArtichron extends Actor {
  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The currently equipped ammunition.
   * @type {Set<ItemArtichron>}
   */
  get ammo() {
    return this.system.ammo ?? new Set();
  }

  /* -------------------------------------------------- */

  /**
   * The currently equipped arsenal.
   * @type {{primary: ItemArtichron, secondary: ItemArtichron}}
   */
  get arsenal() {
    return this.system.arsenal ?? {};
  }

  /* -------------------------------------------------- */

  /**
   * The currently equipped armor set.
   * @type {object}
   */
  get armor() {
    return this.system.armor ?? {};
  }

  /* -------------------------------------------------- */

  /**
   * Does this actor have a shield equipped?
   * @type {boolean}
   */
  get hasShield() {
    return this.system.hasShield ?? false;
  }

  /* -------------------------------------------------- */

  /**
   * The items that this actor has favorited.
   * @type {Set<ItemArtichron>}
   */
  get favorites() {
    return this.system.favorites ?? new Set();
  }

  /* -------------------------------------------------- */
  /*   Preparation                                      */
  /* -------------------------------------------------- */

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

  /* -------------------------------------------------- */

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded documents or derived data.
    super.prepareBaseData();
  }

  /* -------------------------------------------------- */

  /** @override */
  prepareEmbeddedDocuments() {
    this._prepareEmbedded = true;
    super.prepareEmbeddedDocuments(); // this calls 'this.applyActiveEffects()'.
    delete this._prepareEmbedded;
  }

  /* -------------------------------------------------- */
  /*   Life-cycle methods                               */
  /* -------------------------------------------------- */

  /** @override */
  async _preUpdate(update, options, user) {
    // This also calls system._preUpdate.
    const allowed = await super._preUpdate(update, options, user);
    if (allowed === false) return false;
  }

  /* -------------------------------------------------- */

  /** @override */
  _onUpdate(update, options, user) {
    super._onUpdate(update, options, user);
    this._displayScrollingNumbers(options.damages, options.health);
  }

  /* -------------------------------------------------- */

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

  /* -------------------------------------------------- */

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

    const red = 0xFF0000;
    const green = 0x00FF00;
    const blue = 0x0000FF;

    for (const t of tokens) {
      if (!t.visible || t.document.isSecret) continue;
      const c = t.center;
      damages = damages ? damages : {none: -health.delta};
      for (const [type, value] of Object.entries(damages)) {
        if (!value) continue;
        const isHeal = value < 0;
        const color = foundry.utils.Color.from(isHeal ? green : CONFIG.SYSTEM.DAMAGE_TYPES[type]?.color ?? red);
        canvas.interface.createScrollingText(c, (-value).signedString(), {...options, fill: color});
        t.ring?.flashColor(color);
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  /* -------------------------------------------------- */
  /*   Methods                                          */
  /* -------------------------------------------------- */

  /** @override */
  getRollData() {
    const data = this.system.getRollData();
    data.name = this.name;
    return data;
  }

  /* -------------------------------------------------- */

  /**
   * Apply damage to this actor.
   * @param {number|object} values              An object with keys from DAMAGE_TYPES.
   * @param {object} [options]                  Damage application options.
   * @param {boolean} [options.defendable]      Whether the actor can parry or block this damage.
   * @param {boolean} [options.resisted]        Whether resistances and armor can reduce this damage.
   * @param {Set<string>} [options.attributes]  Item attributes that change the application behavior.
   * @param {object} [context]                  Update options that are passed along to the final update.
   * @returns {Promise<ActorArtichron>}
   */
  async applyDamage(values, {defendable = true, resisted = true, attributes = new Set()} = {}, context = {}) {
    if (!this.system.health.value) return this;

    if (foundry.utils.getType(values) === "number") {
      values = {none: values};
    }

    values = foundry.utils.deepClone(values);

    const resistances = this.system.resistances;
    const armor = this.system.defenses.armor;
    const types = CONFIG.SYSTEM.DAMAGE_TYPES;

    // Modify values to take resistances into account.
    for (let [type, value] of Object.entries(values)) {
      if (!resisted || (type === "none")) continue;

      // Resisted?
      if (types[type].resist) value -= resistances[type].value;

      // Reduced by armor?
      if (types[type].armor) value -= armor.value;

      if (value <= 0) delete values[type];
      else values[type] = value;
    }

    let dmg = Object.entries(values).reduce((acc, [k, v]) => acc + v, 0);
    let blocking = defendable ? await this.defenseDialog(dmg) : 0;
    if (blocking === false) return this;

    for (const [type, value] of Object.entries(values)) {
      if (!blocking) break;
      const diff = Math.min(value, blocking);
      blocking -= diff;
      values[type] -= diff;
    }

    // Recalculate damage after defensive rolls.
    dmg = Object.entries(values).reduce((acc, [k, v]) => acc + v, 0);
    const hp = foundry.utils.deepClone(this.system.health);
    const val = Math.clamp(hp.value - Math.max(0, dmg), 0, hp.max);
    await this.update({"system.health.value": val}, {
      ...context,
      damages: values,
      diff: false
    });

    // If the actor was damaged, apply any relevant status conditions.
    const damaged = hp.value > this.system.health.value;
    if (damaged) {
      if (attributes.has("rending")) {
        await this.applyCondition("bleeding");
      }
    }

    return this;
  }

  /* -------------------------------------------------- */

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

    const roll = await Roll.create(pool.formula).alter(1, amount - 1).evaluate();
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

  /* -------------------------------------------------- */

  /**
   * Roll damage with an equipped arsenal item.
   * @param {string} [key]          Arsenal to roll with, 'primary' or 'secondary'.
   * @param {object} [options]      Options to modify the roll.
   * @returns {Promise}
   */
  async rollDamage(key = null, options = {}) {
    return this.system.rollDamage(key, options);
  }

  /* -------------------------------------------------- */

  /**
   * Roll a skill.
   * @param {object} config                   Roll configuration object.
   * @param {string} config.skillId           The internal key used for the skill.
   * @param {object} [options]                Options to modify the rolling.
   * @param {string} [options.rollMode]       The roll mode to use for the chat message.
   * @param {boolean} [options.create]        Whether to create a chat message or return the evaluated roll.
   * @returns {Promise<ChatMessage|Roll>}     The created chat message, or the evaluated roll.
   */
  async rollSkill({skillId, ...config}, {rollMode, create = true} = {}) {
    const rollData = this.getRollData();
    rollData.value = config.value ?? rollData.skills[skillId].value;
    const roll = foundry.dice.Roll.create("(@value)d6even", rollData);
    const speaker = ChatMessage.implementation.getSpeaker({actor: this});
    rollMode ??= game.settings.get("core", "rollMode");
    const flavor = game.i18n.format("ARTICHRON.Skills.ChatMessageFlavor", {
      skill: CONFIG.SYSTEM.SKILLS[skillId].label,
      actor: this.name
    });
    const messageData = {flavor, speaker, rolls: [roll]};
    ChatMessage.implementation.applyRollMode(messageData, rollMode);

    await roll.evaluate();
    return create ? ChatMessage.implementation.create(messageData) : roll;
  }

  /* -------------------------------------------------- */

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

  /* -------------------------------------------------- */

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

  /* -------------------------------------------------- */

  /**
   * Retrieve the level of a condition effect.
   * @param {string} status
   * @returns {number}
   */
  appliedConditionLevel(status) {
    const effect = this.effects.get(artichron.utils.staticId(status));
    return effect ? effect.system.level : 0;
  }

  /* -------------------------------------------------- */

  /**
   * Utility method to either apply or increase the level of a status condition.
   * This method can safely be used on statuses that do not have levels.
   * @param {string} status
   * @returns {Promise}
   */
  async applyCondition(status) {
    const id = artichron.utils.staticId(status);
    if (this.effects.has(id)) return this.effects.get(id).system.increase();
    else return this.toggleStatusEffect(status);
  }

  /* -------------------------------------------------- */
  /*   Action Points                                    */
  /* -------------------------------------------------- */

  /** @override */
  get inCombat() {
    return super.inCombat;
  }

  /* -------------------------------------------------- */

  /**
   * This actor's current combatant.
   * @type {Combatant|null}
   */
  get combatant() {
    return game.combat?.getCombatantsByActor(this)[0] ?? null;
  }

  /* -------------------------------------------------- */

  /**
   * Reference to this actor's current amount of pips.
   * @type {number|null}      The action points, or null if not in combat.
   */
  get actionPoints() {
    if (!this.inCombat) return null;
    return this.system.pips.value;
  }

  /* -------------------------------------------------- */

  /**
   * Adjust the remaining action points of this actor.
   * @param {number} [value]                The amount to spend. Omit to spend 1 point, use negative values to gain points.
   * @returns {Promise<ActorArtichron>}     A promise that resolves to the updated actor.
   */
  async spendActionPoints(value = 1) {
    if (!this.inCombat) throw new Error("This actor is not in combat.");
    await this.update({"system.pips.value": this.system.pips.value - value});
    return this;
  }

  /* -------------------------------------------------- */

  /**
   * Can this actor perform an action that costs a certain amount of action points?
   * @param {number} [value]      The action point cost.
   * @returns {boolean}
   */
  canPerformActionPoints(value = 1) {
    if (!this.inCombat) return true;
    return this.actionPoints >= value;
  }

  /* -------------------------------------------------- */

  /**
   * Render a dialog to adjust the action points.
   * @returns {Promise}
   */
  async actionPointsDialog() {
    if (!this.inCombat) return null;
    const field = this.system.schema.getField("pips.value");
    const max = Math.max(this.system.pips.value, 15);
    const value = this.system.pips.value;
    const content = field.toFormGroup({localize: true}, {max: max, value: value});
    foundry.applications.api.DialogV2.prompt({
      content: `<fieldset>${content.outerHTML}</fieldset>`,
      modal: true,
      rejectClose: false,
      window: {title: field.label, icon: "fa-solid fa-circle"},
      position: {width: 400, height: "auto"},
      ok: {
        icon: "fa-solid fa-check",
        label: "Confirm",
        callback: (event, button, html) => {
          const name = "system.pips.value";
          this.update({[name]: button.form.elements[name].value});
        }
      }
    });
  }
}
