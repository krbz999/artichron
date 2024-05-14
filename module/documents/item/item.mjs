export default class ItemArtichron extends Item {
  /* ---------------------------------------- */
  /*                                          */
  /*                  GETTERS                 */
  /*                                          */
  /* ---------------------------------------- */

  /**
   * Is this wielded in one hand?
   * @type {boolean}
   */
  get isOneHanded() {
    return this.system.isOneHanded ?? false;
  }

  /**
   * Is this wielded with two hands?
   * @type {boolean}
   */
  get isTwoHanded() {
    return this.system.isTwoHanded ?? false;
  }

  /**
   * Is this an arsenal item?
   * @type {boolean}
   */
  get isArsenal() {
    return ["weapon", "spell", "shield"].includes(this.type);
  }

  /**
   * Is this item equipped on the actor in one of the slots?
   * @type {boolean}
   */
  get isEquipped() {
    if (!this.isEmbedded) return false;
    if (this.isArsenal) return Object.values(this.actor.arsenal).includes(this);
    else if (this.type === "armor") return Object.values(this.actor.armor).includes(this);
    return false;
  }

  /**
   * Retrieve a token from this item's owning actor.
   * @type {TokenArtichron|null}
   */
  get token() {
    const actor = this.actor;
    if (!actor) return null;
    const [token] = actor.isToken ? [actor.token?.object] : actor.getActiveTokens();
    return token ?? null;
  }

  /**
   * Does this item have any valid template or targeting types?
   * @type {boolean}
   */
  get hasTemplate() {
    return this.system.hasTemplate ?? false;
  }

  /**
   * Does this item have any valid fusions it can apply?
   * @type {boolean}
   */
  get hasFusions() {
    return this.system.hasFusions ?? false;
  }

  /**
   * Is this item currently under the effect of a fusion?
   * @type {boolean}
   */
  get isFused() {
    return this.system.isFused ?? false;
  }

  /**
   * Is this a valid item type for fusing?
   * @type {boolean}
   */
  get canFuse() {
    return (this.type === "armor") || this.isArsenal;
  }

  /**
   * Does this item have a limited number of uses?
   * @type {boolean}
   */
  get hasUses() {
    return this.system.hasUses ?? false;
  }

  /**
   * Does this item have any valid damage formulas?
   * @type {boolean}
   */
  get hasDamage() {
    return this.system.hasDamage ?? false;
  }

  /* ---------------------------------------- */
  /*                                          */
  /*            PREPARATION METHODS           */
  /*                                          */
  /* ---------------------------------------- */

  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareEmbeddedDocuments() {
    super.prepareEmbeddedDocuments();
    if (!this.isEmbedded || this.actor._prepareEmbedded) this.applyActiveEffects();
  }

  /**
   * Apply changes from item-specific active effects.
   */
  applyActiveEffects() {
    const overrides = {};
    const changes = [];

    const validFields = this.system.BONUS_FIELDS;

    for (const e of this.allApplicableEffects()) {
      if (!e.active) continue;
      changes.push(...e.changes.reduce((acc, change) => {
        if (validFields.has(change.key)) {
          const c = foundry.utils.deepClone(change);
          c.effect = e;
          c.priority ??= c.mode * 10;
          acc.push(c);
        }
        return acc;
      }, []));
    }
    changes.sort((a, b) => a.priority - b.priority);
    for (const c of changes) {
      const result = c.effect.apply(this, c);
      Object.assign(overrides, result);
    }
    this.overrides = foundry.utils.expandObject(overrides);
  }

  /**
   * Get all effects that may apply to this item.
   * @yields {ActiveEffectArtichron}
   * @returns {Generator<ActiveEffectArtichron, void, void}
   */
  *allApplicableEffects() {
    for (const e of this.effects) if (e.type === "fusion") yield e;
  }

  /**
   * Retrieve all effects that currently modify this item.
   * @type {ActiveEffectArtichron[]}
   */
  get appliedEffects() {
    const effects = [];
    for (const e of this.allApplicableEffects()) {
      if (e.active) effects.push(e);
    }
    return effects;
  }

  /* ---------------------------------------- */
  /*                                          */
  /*               UPDATE METHODS             */
  /*                                          */
  /* ---------------------------------------- */

  /** @override */
  async _preUpdate(update, options, user) {
    const allowed = await super._preUpdate(update, options, user);
    if (allowed === false) return false;
    if (this.isEquipped && ("value" in (update.system?.wield ?? {}))) {
      ui.notifications.warn("You cannot change the Wield state of an equipped item.");
      return false;
    }
  }

  /** @override */
  _onUpdate(update, options, user) {
    return super._onUpdate(update, options, user);
  }

  /* ---------------------------------------- */
  /*                                          */
  /*                ITEM METHODS              */
  /*                                          */
  /* ---------------------------------------- */

  /** @override */
  getRollData() {
    if (!this.actor) return null;
    const data = this.actor.getRollData();
    data.item = {...this.system};
    data.item.name = this.name;
    return data;
  }

  /**
   * Favorite this item on its actor.
   * @returns {Promise<ActorArtichron|null>}
   */
  async favorite() {
    if (!this.actor) return null;
    const favorites = this.actor.system.toObject().equipped.favorites;
    if (favorites.includes(this.id)) favorites.findSplice(i => i === this.id);
    else favorites.push(this.id);
    return this.actor.update({"system.equipped.favorites": favorites});
  }

  /**
   * Perform the item's type-specific main function.
   * @returns {Promise}
   */
  async use() {
    if (this.system.use) return this.system.use();
    return null;
  }

  /**
   * Pick targets within range of this item.
   * @param {object} [options]                        Additional options.
   * @returns {Promise<TokenDocumentArtichron[]>}     The token documents of those targeted.
   */
  async pickTarget(options = {}) {
    if (this.system.pickTarget) return this.system.pickTarget(options);
    return null;
  }

  /**
   * Prompt for placing templates using this item.
   * @param {object} config     Template configuration and placement data.
   * @returns {Promise<MeasuredTemplateArtichron[]>}
   */
  async placeTemplates(config) {
    if (this.system.placeTemplates) return this.system.placeTemplates(config);
    return null;
  }

  /**
   * Pick one of the fusion options of this item, grant it to a target item, and destroy this.
   * @param {ItemArtichron} target                      The target item.
   * @param {ActiveEffectArtichron} fusion              The fusion template effect.
   * @returns {Promise<ActiveEffectArtichron|null>}     The created fusion effect.
   */
  async fuse(target, fusion) {
    if (this.system.fuse) return this.system.fuse(target, fusion);
    return null;
  }

  /**
   * Prompt a dialog to pick a valid fusion target, then pass the selection off to the 'fuse' method.
   * @returns {Promise<ActiveEffectArtichron|null>}
   */
  async fuseDialog() {
    if (this.system.fuseDialog) return this.system.fuseDialog();
    return null;
  }
}
