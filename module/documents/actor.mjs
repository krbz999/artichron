/**
 * @typedef {object} DamageDescription
 * @property {string} type                    The damage type.
 * @property {number} value                   The damage total.
 * @property {DamageOptions} [options]        Damage part options.
 * @property {DamageStatuses} [statuses]      Statuses and the levels that will be applied.
 */

/**
 * @typedef {object} DamageOptions        Options that configure how the damage is applied.
 * @property {boolean} [undefendable]       If `true`, this cannot be reduced by defending.
 * @property {boolean} [indiminishable]     If `true`, this cannot be reduced by armor.
 * @property {boolean} [irresistible]       If `true`, this cannot be reduced by resistances.
 */

/**
 * @typedef {object} DamageStatuses   Record of the statuses that will be applied.
 * @property {number} [bleeding]      How many levels of the 'Bleeding' status will be applied.
 * @property {number} [hindered]      How many levels of the 'Hindered' status will be applied.
 */

export default class ActorArtichron extends Actor {
  /* -------------------------------------------------- */
  /*   Properties                                       */
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
    const ids = this.system.favorites ?? [];
    const items = new Set();
    for (const id of ids) {
      const item = this.items.get(id);
      if (item) items.add(item);
    }
    return items;
  }

  /* -------------------------------------------------- */

  /**
   * The items that this monster will drop when killed.
   * @type {object[]}     Objects with an index entry and quantity.
   */
  get lootDrops() {
    return this.system.lootDrops ?? [];
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
    this._prepareEmbedded = true; // avoid applying effects to items twice.
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

    const isFriendly = ["hero", "merchant", "party"].includes(this.type);
    const display = this.type === "hero";
    const tokenData = {
      sight: {enabled: this.type === "hero"},
      actorLink: isFriendly,
      disposition: CONST.TOKEN_DISPOSITIONS[isFriendly ? "FRIENDLY" : "HOSTILE"],
      displayName: CONST.TOKEN_DISPLAY_MODES[display ? "HOVER" : "OWNER_HOVER"],
      displayBars: CONST.TOKEN_DISPLAY_MODES[display ? "HOVER" : "OWNER_HOVER"]
    };
    this.updateSource({prototypeToken: tokenData});
  }

  /* -------------------------------------------------- */

  /**
   * Display scrolling damage numbers on each of this actor's tokens.
   * @param {DamageDescription[]} [damages]     Damage taken. If healing, this is omitted.
   * @param {object} [health]                   An object describing changes to health.
   * @returns {Promise<void>}
   */
  async _displayScrollingNumbers(damages, health) {
    if (!damages?.length && !health) return;
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

    const displayNumbers = async (token) => {
      const c = token.center;
      damages = damages ? damages : [{type: (health.delta > 0) ? "healing" : "", value: health.delta}];
      for (const damage of damages) {
        if (!damage.value) continue;
        const isDamage = damage.type !== "healing";
        const invert = isDamage && (damage.type !== "");
        const text = (invert ? (-damage.value) : damage.value).signedString();
        const color = foundry.utils.Color.from(isDamage ? (CONFIG.SYSTEM.DAMAGE_TYPES[damage.type]?.color ?? red) : green);
        canvas.interface.createScrollingText(c, text, {...options, fill: color});
        token.ring?.flashColor(color);
        await new Promise(r => setTimeout(r, 350));
      }
    };

    for (const t of tokens) if (t.visible && !t.document.isSecret) displayNumbers(t);
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @override */
  getRollData() {
    const data = this.system.getRollData();
    data.name = this.name;
    return data;
  }

  /* -------------------------------------------------- */

  /**
   * Calculate damage that will be taken, excepting any reductions from parrying and blocking.
   * @param {number|DamageDescription[]} damages      Damage to be applied.
   * @param {object} [options]                        Damage calculation options.
   * @param {boolean} [options.numeric]               Whether to return the damage descriptions instead of the total damage.
   * @returns {number|DamageDescription[]}            The amount of damage taken, or the modified values.
   */
  calculateDamage(damages, {numeric = true} = {}) {
    if (foundry.utils.getType(damages) === "number") {
      damages = [{type: "none", value: damages}];
    }
    damages = foundry.utils.deepClone(damages);

    const types = CONFIG.SYSTEM.DAMAGE_TYPES;

    // Values are cloned so we can prevent double-dipping.
    let armor = this.system.defenses.armor;
    const resistances = foundry.utils.deepClone(this.system.resistances);

    const diminished = damage => {
      if (damage.options?.indiminishable) return;
      if (!types[damage.type]?.armor || !armor) return;

      const diff = Math.min(damage.value, armor);
      armor = armor - diff;
      damage.value = damage.value - diff;
    };

    const resisted = damage => {
      if (damage.options?.irresistible === false) return;
      if (!types[damage.type]?.resist || !resistances[damage.type]) return;

      const diff = Math.min(damage.value, resistances[damage.type]);
      resistances[damage.type] = resistances[damage.type] - diff;
      damage.value = damage.value - diff;
    };

    damages = damages.filter(damage => {
      diminished(damage);
      resisted(damage);
      return damage.value > 0;
    });

    return numeric ? damages.reduce((acc, damage) => acc + damage.value, 0) : damages;
  }

  /* -------------------------------------------------- */

  /**
   * Apply damage to this actor.
   * @param {number|DamageDescription[]} damages      Damage to be applied.
   * @returns {Promise<ActorArtichron>}
   */
  async applyDamage(damages) {
    if (!this.system.health?.value) return this;

    damages = this.calculateDamage(damages, {numeric: false});

    // The amount of damage that can be defended.
    const defendableDamage = damages.reduce((acc, damage) => {
      if (damage.options?.undefendable) return acc;
      return acc + damage.value;
    }, 0);

    let blocking = (defendableDamage > 0) ? await this.defenseDialog(defendableDamage) : 0;
    if (blocking === false) return this;

    // Deduct from defensive rolls.
    for (const damage of damages) {
      if (!blocking) break;
      const diff = Math.min(damage.value, blocking);
      blocking = blocking - diff;
      damage.value = damage.value - diff;
    }

    // The statuses to apply.
    const statuses = new Map();
    const statused = damage => {
      if (foundry.utils.isEmpty(damage.statuses)) return;
      for (const [status, level] of Object.entries(damage.statuses)) {
        if (!statuses.has(status)) statuses.set(status, level);
        else statuses.set(status, Math.max(statuses.get(status), level));
      }
    };
    damages = damages.filter(damage => damage.value > 0);
    for (const damage of damages) statused(damage);

    // Recalculate damage after defensive rolls.
    const total = damages.reduce((acc, damage) => acc + damage.value, 0);
    const hp = foundry.utils.deepClone(this.system.health);
    const value = Math.clamp(hp.value - Math.max(0, total), 0, hp.max);
    await this.update({"system.health.value": value}, {damages: damages, diff: false});

    // Apply conditions from applied damage.
    for (const [status, level] of statuses.entries()) await this.applyCondition(status, level);

    return this;
  }

  /* -------------------------------------------------- */

  /**
   * Apply healing to this actor.
   * @param {number} value                  The amount to heal.
   * @returns {Promise<ActorArtichron>}     This actor after having been healed.
   */
  async applyHealing(value) {
    const hp = foundry.utils.deepClone(this.system.health);
    const v = Math.clamp(hp.value + Math.abs(value), 0, hp.max);
    await this.update({"system.health.value": v}, {diff: false});
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
  async rollPool(type, {amount = 1, message = true, event} = {}) {
    if (this.system.rollPool) return this.system.rollPool(type, {amount, message, event});
    return null;
  }

  /* -------------------------------------------------- */

  /**
   * Roll two skills together.
   * @param {object} [config]               Configuration object.
   * @param {string} [config.base]          The first of the skills used.
   * @param {string} [config.second]        The second of the skills used.
   * @returns {Promise<RollArtichron>}      A promise that resolves to the created roll.
   */
  async rollSkill({base, second} = {}) {
    if (this.system.rollSkill) return this.system.rollSkill({base, second});
    return null;
  }

  /* -------------------------------------------------- */

  /**
   * Fully restore any resources.
   * @returns {Promise<ActorArtichron>}
   */
  async recover() {
    if (this.system.recover) await this.system.recover();
    return this;
  }

  /* -------------------------------------------------- */

  /**
   * Prompt the user to roll block and parry to reduce incoming damage using any of their equipped arsenal.
   * @param {number} damage               The damage to attempt to reduce.
   * @returns {Promise<number|false>}     A promise that resolves to the total of all defensive rolls, or false
   *                                      if the dialog was cancelled, which will be taken to mean the damage
   *                                      application should also be cancelled.
   */
  async defenseDialog(damage) {
    const items = Object.values(this.arsenal).filter(item => item?.system.canDefend);
    if (!items.length) return 0;

    // An actor requires at least 1 pip to defend.
    const inCombat = this.inCombat;
    const pips = this.actionPoints;
    if (inCombat && !pips) return 0;

    const choices = items.reduce((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});

    const label = "ARTICHRON.DefenseDialog.Items";
    const input = new foundry.data.fields.SetField(new foundry.data.fields.StringField({choices: choices})).toInput({
      name: "items", type: "checkboxes"
    }).outerHTML;

    const accumulateCost = ids => {
      let cost = 0;
      for (const id of ids) {
        const item = this.items.get(id);
        const activity = item.system.activities.getByType("defend")[0];
        cost += activity.cost.value;
      }
      return cost;
    };

    const render = (event, html) => {
      if (!inCombat) return;
      const items = html.querySelector("[name=items]");
      const button = html.querySelector("[data-action=ok]");
      items.addEventListener("change", event => {
        const ids = event.currentTarget.value;
        const cost = accumulateCost(ids);
        button.disabled = cost > pips;
        button.querySelector("span").textContent = `${game.i18n.localize("ARTICHRON.DefenseDialog.Confirm")} (${cost})`;
      });
    };

    // Center onto token.
    const [token] = this.isToken ? [this.token?.object] : this.getActiveTokens();
    if (token) canvas.animatePan({
      ...token.center, duration: 500, easing: CanvasAnimation.easeOutCircle
    });

    const content = `
    <p>${game.i18n.format("ARTICHRON.DefenseDialog.Content", {name: this.name, damage: damage})}</p>
    <fieldset>
      <legend>${game.i18n.localize(label)}</legend>
      <div class="form-group stacked">
        <div class="form-fields">${input}</div>
      </div>
      <p class="hint">${game.i18n.localize("ARTICHRON.DefenseDialog.ItemsHint")}</p>
    </fieldset>`;

    const prompt = await foundry.applications.api.DialogV2.prompt({
      content: content,
      rejectClose: false,
      modal: true,
      render: render,
      window: {
        icon: "fa-solid fa-shield",
        title: game.i18n.format("ARTICHRON.DefenseDialog.Title", {name: this.name})
      },
      position: {
        width: 400,
        height: "auto"
      },
      ok: {
        icon: "fa-solid fa-dice",
        label: "ARTICHRON.DefenseDialog.Confirm",
        callback: (event, button, html) => {
          return {event, value: button.form.elements.items.value};
        }
      }
    });
    if (!prompt) return false;

    let value = 0;
    for (const id of prompt.value) {
      const item = this.items.get(id);
      const activity = item.system.activities.getByType("defend")[0];
      const message = await activity.use({}, {event: prompt.event}, {});
      if (!message) continue;
      value += message.rolls.reduce((acc, roll) => acc + roll.total, 0);
    }
    return value;
  }

  /* -------------------------------------------------- */

  /**
   * Retrieve the level of a condition effect.
   * @param {string} status     The id of a condition as found in `CONFIG.statusEffects`.
   * @returns {number}          The level of the condition.
   */
  appliedConditionLevel(status) {
    const effect = this.effects.get(artichron.utils.staticId(status));
    return effect ? effect.system.level : 0;
  }

  /* -------------------------------------------------- */

  /**
   * Utility method to either apply or increase the level of a status condition.
   * This method can safely be used on statuses that do not have levels.
   * @param {string} status       The id of a condition as found in `CONFIG.statusEffects`.
   * @param {number} [levels]     How many levels to increase by.
   * @returns {Promise}
   */
  async applyCondition(status, levels = 1) {
    const id = artichron.utils.staticId(status);
    const hasLevels = !!CONFIG.SYSTEM.STATUS_CONDITIONS[status].levels;
    const effect = this.effects.get(id);

    if (effect && hasLevels) return effect.system.increase(levels);
    else if (hasLevels && (levels > 1)) {
      const effect = await ActiveEffect.fromStatusEffect(status);
      const data = foundry.utils.mergeObject(effect.toObject(), {
        _id: id, "system.level": levels
      });
      return this.createEmbeddedDocuments("ActiveEffect", [data], {keepId: true});
    }
    return this.toggleStatusEffect(status, {active: true});
  }

  /* -------------------------------------------------- */

  /**
   * Utility method to either remove or decrease the level of a status condition.
   * This method can safely be used on statuses that do not have levels.
   * @param {string} status     The id of a condition as found in `CONFIG.statusEffects`.
   * @returns {Promise}
   */
  async unapplyCondition(status) {
    const id = artichron.utils.staticId(status);
    const hasLevels = !!CONFIG.SYSTEM.STATUS_CONDITIONS[status].levels;
    const effect = this.effects.get(id);
    const decrease = effect && hasLevels && (effect.system.level > 1);

    if (decrease) return effect.system.decrease();
    return this.toggleStatusEffect(status, {active: false});
  }

  /* -------------------------------------------------- */
  /*   Item favoriting                                  */
  /* -------------------------------------------------- */

  /**
   * Toggle whether an item is favorited.
   * @param {string} id                           The id of the item to toggle.
   * @returns {Promise<ActorArtichron|null>}      A promise that resolves to updated actor.
   */
  async toggleFavoriteItem(id) {
    const item = this.items.get(id);
    if (!item) return null;
    const favorites = new Set(this.favorites);
    if (favorites.has(item)) favorites.delete(item);
    else favorites.add(item);
    const value = Array.from(favorites).map(k => k.id);
    return this.update({"system.favorites": value});
  }

  /* -------------------------------------------------- */

  /**
   * Remove an item as favorite.
   * @param {string} id                           The id of the item to unfavorite.
   * @returns {Promise<ActorArtichron|null>}      A promise that resolves to updated actor.
   */
  async removeFavoriteItem(id) {
    const item = this.items.get(id);
    if (!item) return null;
    const favorites = new Set(this.favorites);
    if (!favorites.has(item)) return null;
    favorites.delete(item);
    const value = Array.from(favorites).map(k => k.id);
    return this.update({"system.favorites": value});
  }

  /* -------------------------------------------------- */

  /**
   * Add a favorited item.
   * @param {string} id                           The id of the item to favorite.
   * @returns {Promise<ActorArtichron|null>}      A promise that resolves to updated actor.
   */
  async addFavoriteItem(id) {
    const item = this.items.get(id);
    if (!item) return null;
    const favorites = new Set(this.favorites);
    if (favorites.has(item)) return null;
    favorites.add(item);
    const value = Array.from(favorites).map(k => k.id);
    return this.update({"system.favorites": value});
  }

  /* -------------------------------------------------- */
  /*   Item monster loot                                */
  /* -------------------------------------------------- */

  /**
   * Add a new loot item.
   * @param {string} uuid           Uuid of the item.
   * @param {number} [quantity]     The quantity of the item.
   * @returns {Promise<ActorArtichron>}
   */
  async addLootDrop(uuid, quantity = 1) {
    if (this.system.addLootDrop) await this.system.addLootDrop(uuid, quantity);
    return this;
  }

  /* -------------------------------------------------- */

  /**
   * Remove a loot item.
   * @param {string} uuid     Uuid of the item.
   * @returns {Promise<ActorArtichron>}
   */
  async removeLootDrop(uuid) {
    if (this.system.removeLootDrop) await this.system.removeLootDrop(uuid);
    return this;
  }

  /* -------------------------------------------------- */

  /**
   * Adjust a loot item's quantity.
   * @param {string} uuid         Uuid of the item.
   * @param {number} quantity     The quantity to add or remove. Reducing to 0 will remove the stack.
   * @returns {Promise<ActorArtichron>}
   */
  async adjustLootDrop(uuid, quantity) {
    if (this.system.adjustLootDrop) await this.system.adjustLootDrop(uuid, quantity);
    return this;
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

  /* -------------------------------------------------- */

  /**
   * Determine this actor's action points at the start of the round.
   * @returns {number}
   */
  determineStartingActionPoints() {
    const hindered = this.appliedConditionLevel("hindered");
    const bonus = this.system.pips.turn * game.combat.getCombatantsByActor(this).length;
    const base = (this.type === "hero") ? this.system.pools.stamina.max : this.system.danger.value * 2;
    const value = Math.max(1, base + bonus - hindered);
    return value;
  }
}
