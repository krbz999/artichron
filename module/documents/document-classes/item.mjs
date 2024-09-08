export default class ItemArtichron extends Item {
  /** @override */
  static getDefaultArtwork(itemData) {
    let img;
    switch (itemData.type) {
      case "part": img = "icons/svg/bones.svg"; break;
      case "elixir": img = "icons/svg/explosion.svg"; break;
      case "weapon": img = "icons/svg/sword.svg"; break;
      case "spell": img = "icons/svg/book.svg"; break;
      case "shield": img = "icons/svg/shield.svg"; break;
      case "armor": img = "icons/svg/chest.svg"; break;
      case "ammo": img = "icons/svg/target.svg"; break;
    }
    return img ? {img: img} : super.getDefaultArtwork(itemData);
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * Is this wielded in one hand?
   * @type {boolean}
   */
  get isOneHanded() {
    return this.system.isOneHanded ?? false;
  }

  /* -------------------------------------------------- */

  /**
   * Is this wielded with two hands?
   * @type {boolean}
   */
  get isTwoHanded() {
    return this.system.isTwoHanded ?? false;
  }

  /* -------------------------------------------------- */

  /**
   * Is this an arsenal item?
   * @type {boolean}
   */
  get isArsenal() {
    return ["weapon", "spell", "shield"].includes(this.type);
  }

  /* -------------------------------------------------- */

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

  /* -------------------------------------------------- */

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

  /* -------------------------------------------------- */

  /**
   * Does the owner of this item fulfill all the requirements to gain its benefits?
   * @type {boolean}
   */
  get fulfilledRequirements() {
    return this.system.fulfilledRequirements ?? true;
  }

  /* -------------------------------------------------- */

  /**
   * Can this item be fused onto another?
   * @type {boolean}
   */
  get hasFusions() {
    return this.system.hasFusions ?? false;
  }

  /* -------------------------------------------------- */

  /**
   * Is this item currently under the effect of a fusion?
   * @type {boolean}
   */
  get isFused() {
    return this.system.isFused ?? false;
  }

  /* -------------------------------------------------- */

  /**
   * The set of item properties that this item will modify on the target by default.
   * @type {Set<string>}
   */
  get defaultFusionProperties() {
    return this.system.defaultFusionProperties ?? new Set();
  }

  /* -------------------------------------------------- */

  /**
   * Is this a valid item type for fusing onto another?
   * @type {boolean}
   */
  get canFuse() {
    return (this.type === "armor") || this.isArsenal;
  }

  /* -------------------------------------------------- */

  /**
   * Does this item have a limited number of uses?
   * @type {boolean}
   */
  get hasUses() {
    return this.system.hasUses ?? false;
  }

  /* -------------------------------------------------- */

  /**
   * Is this item ammo?
   * @type {boolean}
   */
  get isAmmo() {
    return this.type === "ammo";
  }

  /* -------------------------------------------------- */

  /**
   * Is this item armor?
   * @type {boolean}
   */
  get isArmor() {
    return this.type === "armor";
  }

  /* -------------------------------------------------- */

  /**
   * Is this item favorited by its owner?
   * @type {boolean}
   */
  get isFavorite() {
    if (!this.isEmbedded) return false;
    return this.actor.favorites.has(this);
  }

  /* -------------------------------------------------- */

  /**
   * Can this item be used to make an attack due to action point cost?
   * @type {boolean}
   */
  get canUsePips() {
    return this.system.canUsePips ?? false;
  }

  /* -------------------------------------------------- */

  /**
   * Does this item have any effects that can be transferred to the actor when this item is used?
   * @type {boolean}
   */
  get hasTransferrableEffects() {
    return this.system.hasTransferrableEffects ?? false;
  }

  /* -------------------------------------------------- */

  /**
   * The effects that can be transferred to the actor when this item is used.
   * @type {ActiveEffectArtichron[]}
   */
  get transferrableEffects() {
    return this.system.transferrableEffects ?? [];
  }

  /* -------------------------------------------------- */
  /*   Preparation methods                              */
  /* -------------------------------------------------- */

  /** @override */
  prepareData() {
    super.prepareData();
  }

  /* -------------------------------------------------- */

  /** @override */
  prepareEmbeddedDocuments() {
    super.prepareEmbeddedDocuments();
    if (!this.isEmbedded || this.actor._prepareEmbedded) this.applyActiveEffects();
  }

  /* -------------------------------------------------- */

  /**
   * Apply changes from item-specific active effects.
   */
  applyActiveEffects() {
    const overrides = {};
    const changes = [];

    const validFields = this.system.constructor.BONUS_FIELDS;

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

  /* -------------------------------------------------- */

  /**
   * Get all effects that may apply to this item.
   * @yields {ActiveEffectArtichron}
   * @returns {Generator<ActiveEffectArtichron, void, void}
   */
  *allApplicableEffects() {
    for (const e of this.effects) {
      if ((e.type === "fusion") || (e.type === "enhancement")) yield e;
    }
  }

  /* -------------------------------------------------- */

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

  /* -------------------------------------------------- */
  /*   Life-cycle methods                               */
  /* -------------------------------------------------- */

  /** @override */
  async _preUpdate(update, options, user) {
    const allowed = await super._preUpdate(update, options, user);
    if (allowed === false) return false;
    if (this.isEquipped && ("value" in (update.system?.wield ?? {}))) {
      if (this.system.wield.value !== update.system.wield.value) {
        ui.notifications.warn("You cannot change the Wield state of an equipped item.");
        delete update.system.wield.value;
      }
    }
  }

  /* -------------------------------------------------- */

  /** @override */
  _onUpdate(update, options, user) {
    return super._onUpdate(update, options, user);
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @override */
  getRollData() {
    const data = this.isEmbedded ? this.actor.getRollData() : {};
    data.item = this.system.getRollData();
    data.item.name = this.name;
    return data;
  }

  /* -------------------------------------------------- */

  /**
   * Favorite this item on its actor.
   * @returns {Promise<ActorArtichron|null>}
   */
  async favorite() {
    if (!this.isEmbedded) return null;
    this.actor.toggleFavoriteItem(this.id);
  }

  /* -------------------------------------------------- */

  /**
   * Perform the item's type-specific main function.
   * @returns {Promise}
   */
  async use() {
    if (this.system.use) return this.system.use();
    return null;
  }

  /* -------------------------------------------------- */

  /**
   * Prompt for placing templates using this item.
   * @param {object} config     Template configuration and placement data.
   * @returns {Promise<MeasuredTemplateArtichron[]>}
   */
  async placeTemplates(config) {
    if (this.system.placeTemplates) return this.system.placeTemplates(config);
    return null;
  }

  /* -------------------------------------------------- */

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

  /* -------------------------------------------------- */

  /**
   * Prompt a dialog to pick a valid fusion target, then pass the selection off to the 'fuse' method.
   * @returns {Promise<ActiveEffectArtichron|null>}
   */
  async fuseDialog() {
    if (this.system.fuseDialog) return this.system.fuseDialog();
    return null;
  }

  /* -------------------------------------------------- */

  /**
   * Perform a damage roll.
   * @param {object} [config]                 Damage roll configuration.
   * @param {string[]} [config.ids]           The ids of the damage roll to use. If excluded, uses all rolls.
   * @param {ItemArtichron} [config.ammo]     Ammunition item for modifying the damage roll.
   * @param {number} [config.multiply]        The number to muliply all dice amounts by.
   * @param {number} [config.addition]        The number of additional dice to add to the formulas.
   * @param {object} [options]                Options that modify the chat message.
   * @param {boolean} [options.create]        Whether to create the chat message or return the rolls.
   */
  async rollDamage(config = {}, options = {}) {
    if (this.system.rollDamage) return this.system.rollDamage(config, options);
    return null;
  }
}
