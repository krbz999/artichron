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

    const displayNumbers = async (token) => {
      const c = token.center;
      damages = damages ? damages : {none: {value: -health.delta}};
      for (const [type, {value}] of Object.entries(damages)) {
        if (!value) continue;
        const isHeal = value < 0;
        const color = foundry.utils.Color.from(isHeal ? green : CONFIG.SYSTEM.DAMAGE_TYPES[type]?.color ?? red);
        canvas.interface.createScrollingText(c, (-value).signedString(), {...options, fill: color});
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
   * @param {number|object} values          An object with keys from DAMAGE_TYPES.
   * @param {object} [options]              Damage calculation options.
   * @param {boolean} [options.numeric]     Whether to return the damage descriptions instead of the total damage.
   * @returns {number|object}               The amount of damage taken, or the modified object.
   */
  calculateDamage(values, {numeric = true} = {}) {
    if (foundry.utils.getType(values) === "number") {
      values = {none: {value: values}};
    }

    values = foundry.utils.deepClone(values);

    // Modify values to take resistances into account.
    for (const [type, {value, resisted}] of Object.entries(values)) {
      if ((resisted === false) || (type === "none")) continue;

      let v = value;

      // Resisted?
      if (CONFIG.SYSTEM.DAMAGE_TYPES[type].resist) v -= this.system.resistances[type];

      // Reduced by armor?
      if (CONFIG.SYSTEM.DAMAGE_TYPES[type].armor) v -= this.system.defenses.armor;

      values[type].value = Math.max(0, v);
    }

    return numeric ? Object.values(values).reduce((acc, {value}) => acc + value, 0) : values;
  }

  /* -------------------------------------------------- */

  /**
   * Apply damage to this actor.
   * @param {number|object} values              An object with keys from DAMAGE_TYPES.
   * @param {object} [options]                  Damage application options.
   * @param {boolean} [options.defendable]      Whether the actor can parry or block this damage.
   * @param {object} [options.attributes]       Object of item attributes to the level to apply.
   * @param {object} [context]                  Update options that are passed along to the final update.
   * @returns {Promise<ActorArtichron>}
   */
  async applyDamage(values, {defendable = true, attributes} = {}, context = {}) {
    if (!this.system.health?.value) return this;

    values = this.calculateDamage(values, {numeric: false});
    let dmg = Object.values(values).reduce((acc, {value}) => acc + value, 0);
    let blocking = defendable ? await this.defenseDialog(dmg) : 0;
    if (blocking === false) return this;

    for (const [type, {value}] of Object.entries(values)) {
      if (!blocking) break;
      const diff = Math.min(value, blocking);
      blocking -= diff;
      values[type].value -= diff;
    }

    // Recalculate damage after defensive rolls.
    dmg = Object.values(values).reduce((acc, {value}) => acc + value, 0);
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
      if (attributes.has("rending")) await this.applyCondition("bleeding", attributes.get("rending"));
      if (attributes.has("bludgeoning")) await this.applyCondition("hindered", attributes.get("bludgeoning"));
    }

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

    const itemIds = await foundry.applications.api.DialogV2.prompt({
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
        callback: (event, button, html) => button.form.elements.items.value
      }
    });
    let value = 0;
    if (!itemIds) return false;

    for (const id of itemIds) {
      const item = this.items.get(id);
      const activity = item.system.activities.getByType("defend")[0];
      const message = await activity.use();
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
