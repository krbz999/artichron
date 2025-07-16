import BaseDocumentMixin from "./base-document-mixin.mjs";

/**
 * Base actor document class.
 * @extends foundry.documents.Actor
 * @mixes BaseDocumentMixin
 */
export default class ActorArtichron extends BaseDocumentMixin(foundry.documents.Actor) {
  /* -------------------------------------------------- */
  /*   Properties                                       */
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
   * @type {object[]}   Objects with an index entry and quantity.
   */
  get lootDrops() {
    return this.system.lootDrops ?? [];
  }

  /* -------------------------------------------------- */

  /**
   * Internal record used to cache trait advancements to apply their changes during data prep.
   * This record is populated during `prepareEmbeddedDocuments`.
   * @type {Record<string, Set>}
   * @internal
   */
  _traits;

  /* -------------------------------------------------- */
  /*   Preparation                                      */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareData() {
    delete this._traits;

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

  /** @inheritdoc */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded documents or derived data.
    super.prepareBaseData();
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareEmbeddedDocuments() {
    this._prepareEmbedded = true; // avoid applying effects to items twice.
    super.prepareEmbeddedDocuments(); // this calls 'this.applyActiveEffects()'.
    delete this._prepareEmbedded;
  }

  /* -------------------------------------------------- */
  /*   Life-cycle methods                               */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onUpdate(update, options, user) {
    super._onUpdate(update, options, user);
    this._displayScrollingNumbers(options.damages, options.health);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;

    const isFriendly = ["hero", "merchant", "party"].includes(this.type);
    const display = this.type === "hero";
    const tokenData = {
      sight: { enabled: this.type === "hero" },
      actorLink: isFriendly,
      disposition: CONST.TOKEN_DISPOSITIONS[isFriendly ? "FRIENDLY" : "HOSTILE"],
      displayName: CONST.TOKEN_DISPLAY_MODES[display ? "HOVER" : "OWNER_HOVER"],
      displayBars: CONST.TOKEN_DISPLAY_MODES[display ? "HOVER" : "OWNER_HOVER"],
      bar1: {
        attribute: "health",
      },
    };
    this.updateSource({ prototypeToken: tokenData });
  }

  /* -------------------------------------------------- */

  /**
   * Display scrolling damage numbers on each of this actor's tokens.
   * @param {DamageDescription[]} [damages]   Damage taken. If healing, this is omitted.
   * @param {object} [health]                 An object describing changes to health.
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
      jitter: 2,
    };

    const red = 0xFF0000;
    const green = 0x00FF00;
    const blue = 0x0000FF;

    const displayNumbers = async (token) => {
      const c = token.center;
      damages = damages ? damages : [{ type: (health.delta > 0) ? "healing" : "", value: health.delta }];
      for (const damage of damages) {
        if (!damage.value) continue;
        const isDamage = damage.type !== "healing";
        const invert = isDamage && (damage.type !== "");
        const text = (invert ? (-damage.value) : damage.value).signedString();
        const color = foundry.utils.Color.from(isDamage ? (artichron.config.DAMAGE_TYPES[damage.type]?.color ?? red) : green);
        canvas.interface.createScrollingText(c, text, { ...options, fill: color });
        token.ring?.flashColor(color);
        await new Promise(r => setTimeout(r, 350));
      }
    };

    for (const t of tokens) if (t.visible && !t.document.isSecret) displayNumbers(t);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async modifyTokenAttribute(attribute, value, isDelta = false, isBar = true) {
    if (!isBar) return super.modifyTokenAttribute(attribute, value, isDelta, isBar);

    const schema = this.system.schema.getField(attribute);
    const object = foundry.utils.getProperty(this.system, attribute);

    const isSpent = schema.has("spent");
    const current = isSpent ? object.spent : object.value;
    const update = isDelta
      ? current + (isSpent ? -value : value)
      : isSpent ? (object.max - value) : value;
    if (update === current) return this;

    const updates = {
      [`system.${attribute}.${isSpent ? "spent" : "value"}`]: Math.clamp(update, 0, object.max),
    };

    const allowed = Hooks.call("modifyTokenAttribute", { attribute, value, isDelta, isBar }, updates, this);
    return (allowed === false) ? this : this.update(updates);
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  getRollData() {
    const data = this.system.getRollData();
    data.name = this.name;
    return data;
  }

  /* -------------------------------------------------- */
  /*   Status Effects                                   */
  /* -------------------------------------------------- */

  /**
   * Retrieve the level of a condition effect.
   * @param {string} status   The id of a condition as found in `CONFIG.statusEffects`.
   * @returns {number}        The level of the condition.
   */
  appliedConditionLevel(status) {
    const effect = this.effects.get(artichron.utils.staticId(status));
    return effect ? effect.system.level : 0;
  }

  /* -------------------------------------------------- */

  /**
   * Toggle a configured status effect for the Actor.
   * @override
   * @param {string} statusId       A status effect ID defined in CONFIG.statusEffects
   * @param {object} [options={}]   Additional options which modify how the effect is created
   * @param {boolean} [options.active]        Force the effect to be active or inactive regardless of its current state
   * @param {boolean} [options.overlay=false] Display the toggled effect as an overlay
   * @param {number} [options.levels=1]       A potential level increase.
   * @param {number} [options.rounds=2]       A potential duration. The duration is always reset, but additive for
   *                                          unleveled conditions.
   * @returns {Promise<ActiveEffect|boolean|undefined>}  A promise which resolves to one of the following values:
   *                                 - ActiveEffect if a new effect need to be created or updated.
   *                                 - true if was already an existing effect
   *                                 - false if an existing effect needed to be removed
   *                                 - undefined if no changes need to be made
   */
  async toggleStatusEffect(statusId, { active, overlay = false, levels = 1, rounds = 2 } = {}) {
    const id = artichron.utils.staticId(statusId);
    const hasLevels = !!artichron.config.STATUS_CONDITIONS[statusId].levels;
    const effect = this.effects.get(id);
    active ??= !effect || (effect && hasLevels);
    const Cls = foundry.utils.getDocumentClass("ActiveEffect");

    if (active) {
      // Leveled conditions.
      if (effect && hasLevels) return effect.system.increase(levels);
      else if (hasLevels && (levels > 1)) {
        const effect = await Cls.fromStatusEffect(statusId);
        const data = foundry.utils.mergeObject(effect.toObject(), {
          _id: id, "system.level": levels, "duration.rounds": rounds,
        });
        return Cls.create(data, { parent: this, keepId: true });
      }

      // Conditions without levels.
      if (effect && !hasLevels) {
        return effect.system.extendDuration(rounds);
      } else if (!effect && !hasLevels) {
        const effect = await Cls.fromStatusEffect(statusId);
        const data = foundry.utils.mergeObject(effect.toObject(), {
          _id: id, "duration.rounds": rounds,
        });
        return Cls.create(data, { parent: this, keepId: true });
      }

    } else {
      const decrease = effect && hasLevels && (effect.system.level > 1);
      if (decrease) return effect.system.decrease();
    }

    return super.toggleStatusEffect(statusId, { overlay, active });
  }

  /* -------------------------------------------------- */
  /*   Item favoriting                                  */
  /* -------------------------------------------------- */

  /**
   * Toggle whether an item is favorited.
   * @param {string} id                         The id of the item to toggle.
   * @returns {Promise<ActorArtichron|null>}    A promise that resolves to updated actor.
   */
  async toggleFavoriteItem(id) {
    const item = this.items.get(id);
    if (!item) return null;
    const favorites = new Set(this.favorites);
    if (favorites.has(item)) favorites.delete(item);
    else favorites.add(item);
    const value = Array.from(favorites).map(k => k.id);
    return this.update({ "system.favorites": value });
  }

  /* -------------------------------------------------- */

  /**
   * Remove an item as favorite.
   * @param {string} id                         The id of the item to unfavorite.
   * @returns {Promise<ActorArtichron|null>}    A promise that resolves to updated actor.
   */
  async removeFavoriteItem(id) {
    const item = this.items.get(id);
    if (!item) return null;
    const favorites = new Set(this.favorites);
    if (!favorites.has(item)) return null;
    favorites.delete(item);
    const value = Array.from(favorites).map(k => k.id);
    return this.update({ "system.favorites": value });
  }

  /* -------------------------------------------------- */

  /**
   * Add a favorited item.
   * @param {string} id                         The id of the item to favorite.
   * @returns {Promise<ActorArtichron|null>}    A promise that resolves to updated actor.
   */
  async addFavoriteItem(id) {
    const item = this.items.get(id);
    if (!item) return null;
    const favorites = new Set(this.favorites);
    if (favorites.has(item)) return null;
    favorites.add(item);
    const value = Array.from(favorites).map(k => k.id);
    return this.update({ "system.favorites": value });
  }

  /* -------------------------------------------------- */
  /*   Action Points                                    */
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
   * @type {number|null}    The action points, or `null` if not in combat or invalid actor.
   */
  get actionPoints() {
    if (!this.inCombat) return null;
    return this.system.pips?.value ?? null;
  }

  /* -------------------------------------------------- */

  /**
   * Adjust the remaining action points of this actor.
   * @param {number} [value]              The amount to spend. Omit to spend 1 point, use negative values to gain points.
   * @returns {Promise<ActorArtichron>}   A promise that resolves to the updated actor.
   */
  async spendActionPoints(value = 1) {
    if (!this.inCombat) throw new Error("This actor is not in combat.");
    await this.update({ "system.pips.value": this.system.pips.value - value });
    return this;
  }

  /* -------------------------------------------------- */

  /**
   * Can this actor perform an action that costs a certain amount of action points?
   * @param {number} [value]    The action point cost.
   * @returns {boolean}         Whether the actor is in combat, uses pips, and has enough pips.
   */
  canPerformActionPoints(value = 1) {
    if (!this.inCombat) return true;
    if (!this.system.pips) return true;
    return this.actionPoints >= value;
  }

  /* -------------------------------------------------- */

  /**
   * Render a dialog to adjust the action points.
   * @returns {Promise<ActorArtichron|null>}    A promise that resolves to the updated actor.
   */
  async actionPointsDialog() {
    if (!this.inCombat) return null;
    const field = this.system.schema.getField("pips.value");
    const max = Math.max(this.system.pips.value, 15);
    const value = this.system.pips.value;
    const content = field.toFormGroup({ localize: true }, { max: max, value: value });
    return artichron.applications.api.Dialog.prompt({
      content: `<fieldset>${content.outerHTML}</fieldset>`,
      window: { title: field.label, icon: "fa-solid fa-circle" },
      position: { width: 400, height: "auto" },
      ok: {
        icon: "fa-solid fa-check",
        label: "Confirm",
        callback: (event, button, html) => {
          const name = "system.pips.value";
          this.update({ [name]: button.form.elements[name].value });
        },
      },
    });
  }

  /* -------------------------------------------------- */

  /**
   * Determine this actor's action points at the start of the round.
   * @returns {number}    The number of starting action points.
   */
  determineStartingActionPoints() {
    const hindered = this.appliedConditionLevel("hindered");
    const bonus = this.system.pips.turn * game.combat.getCombatantsByActor(this).length;

    const base = 6;
    return Math.max(1, base + bonus - hindered);
  }

  /* -------------------------------------------------- */

  /**
   * Get the AP cost when moving a certain distance.
   * @param {number} distance   The distance to move, after any modifiers.
   * @returns {number}          The AP cost, a multiple of 0.2.
   */
  getAPMovementCost(distance) {
    return (distance / 5).toNearest(0.2, "ceil");
  }
}
