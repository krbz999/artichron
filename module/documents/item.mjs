import BaseDocumentMixin from "./base-document-mixin.mjs";

/**
 * Base item document class.
 * @extends foundry.documents.Item
 * @mixes BaseDocumentMixin
 */
export default class ItemArtichron extends BaseDocumentMixin(foundry.documents.Item) {
  /** @inheritdoc */
  static getDefaultArtwork(itemData) {
    let img;
    switch (itemData.type) {
      case "ammo":
        img = "icons/svg/target.svg";
        break;
      case "armor":
        img = "icons/svg/chest.svg";
        break;
      case "elixir":
        img = "icons/svg/explosion.svg";
        break;
      case "part":
        img = "icons/svg/bones.svg";
        break;
      case "path":
        img = "icons/svg/statue.svg";
        break;
      case "spell":
        img = "icons/svg/book.svg";
        break;
      case "talent":
        img = "icons/svg/mage-shield.svg";
        break;
    }
    return img ? { img: img } : super.getDefaultArtwork(itemData);
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * Attributes on this item and their levels.
   * @type {Record<string, number>}
   */
  get attributes() {
    const attrs = {};
    for (const attr of this.system.attributes?.value ?? []) {
      const status = artichron.config.ITEM_ATTRIBUTES[attr]?.status;
      if (status) {
        const level = this.system.attributes.levels[status] ?? 1;
        attrs[status] = level;
      }
    }
    return attrs;
  }

  /* -------------------------------------------------- */

  /**
   * Is this item equipped on the actor in one of the slots?
   * @type {boolean}
   */
  get isEquipped() {
    if (!this.isEmbedded) return false;
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
    return this.system.attributes?.value.has("fusion") ?? false;
  }

  /* -------------------------------------------------- */

  /**
   * Is this item currently under the effect of a fusion?
   * @type {boolean}
   */
  get isFused() {
    return this.effects.some(effect => effect.isActiveFusion);
  }

  /* -------------------------------------------------- */

  /**
   * The set of item properties that this item will modify on the target by default.
   * @type {Set<string>}
   */
  get defaultFusionProperties() {
    const paths = [
      "attributes.value",
      "price.value",
      "weight.value",
      "defenses",
    ];

    const set = new Set();
    for (const path of paths) {
      const field = this.system.schema.getField(path);
      if (field) set.add(path);
    }
    return set;
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
   * Can this elixir be used to boost a roll?
   * @type {boolean}
   */
  get isBooster() {
    return this.system.isBooster ?? false;
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

  /**
   * Does this item use ammunition?
   * @type {boolean}
   */
  get usesAmmo() {
    return this.system.usesAmmo ?? false;
  }

  /* -------------------------------------------------- */

  /**
   * The item's identifier.
   * @type {string}
   */
  get identifier() {
    return this.system.identifier;
  }

  /* -------------------------------------------------- */
  /*   Preparation methods                              */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareData() {
    super.prepareData();
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareEmbeddedDocuments() {
    super.prepareEmbeddedDocuments();
    if (!this.isEmbedded || this.actor._prepareEmbedded) this.applyActiveEffects();

    if (this.isEmbedded && this.supportsAdvancements) {
      this.parent._traits ??= {};
      const collection = this.getEmbeddedPseudoDocumentCollection("Advancement");
      for (const [advId, v] of Object.entries(this.flags.artichron?.advancement ?? {})) {
        const adv = collection.get(advId);
        if (adv?.type !== "trait") continue;
        for (const [traitId, traitData] of Object.entries(adv.traits)) {
          if (!v?.selected?.includes?.(traitId)) continue;
          this.parent._traits[traitData.trait] ??= new Set();
          this.parent._traits[traitData.trait].add(traitData);
        }
      }
    }
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
   * @returns {Generator<ActiveEffectArtichron, void, void>}
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

  /** @inheritdoc */
  static async createDialog(data = {}, createOptions = {}, { folders, types, template, ...dialogOptions } = {}) {
    const options = artichron.applications.api.Dialog.DEFAULT_OPTIONS;
    return super.createDialog(data, createOptions, { folders, types, template, ...options });
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  getRollData() {
    const data = this.isEmbedded ? this.actor.getRollData() : {};
    data.item = this.system.getRollData();
    data.item.name = this.name;
    return data;
  }

  /* -------------------------------------------------- */

  /**
   * Favorite this item on its actor.
   * @returns {Promise<ActorArtichron|null>}    A promise that resolves to the updated actor.
   */
  async favorite() {
    if (!this.isEmbedded) return null;
    return this.actor.toggleFavoriteItem(this.id);
  }

  /* -------------------------------------------------- */

  /**
   * Use this item.
   * @returns {Promise}
   */
  async use(usage = {}, dialog = {}, message = {}) {
    if (this.system.use) return this.system.use(usage, dialog, message);
    return null;
  }

  /* -------------------------------------------------- */

  /**
   * Prompt for placing templates using this item.
   * @param {object} config     Template configuration and placement data.
   * @returns {Promise<MeasuredTemplate[]>}
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
    if (this.system.fusion?.fuse) return this.system.fusion.fuse(target, fusion);
    return null;
  }

  /* -------------------------------------------------- */

  /**
   * Prompt a dialog to pick a valid fusion target, then pass the selection off to the 'fuse' method.
   * @returns {Promise<ActiveEffectArtichron|null>}
   */
  async fuseDialog() {
    if (this.system.fusion?.fuseDialog) return this.system.fusion.fuseDialog();
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

  /* -------------------------------------------------- */
  /*   Advancements                                     */
  /* -------------------------------------------------- */

  /**
   * Does this item type support advancements?
   * @type {boolean}
   */
  get supportsAdvancements() {
    return !!this.system.constructor.metadata.embedded?.Advancement;
  }

  /* -------------------------------------------------- */

  /**
   * Has this item granted other items via advancements?
   * @type {boolean}
   */
  get hasGrantedItems() {
    if (!this.supportsAdvancements) return false;
    for (const advancement of this.getEmbeddedPseudoDocumentCollection("Advancement").getByType("itemGrant")) {
      if (advancement.grantedItemsChain().length) return true;
    }
    return false;
  }

  /* -------------------------------------------------- */

  /**
   * An alternative to the document delete method, this deletes the item as well as any items that were
   * added as a result of this item's creation via advancements.
   * @returns {Promise<foundry.documents.Item[]|null>}   A promise that resolves to the deleted items.
   */
  async advancementDeletionPrompt() {
    if (!this.isEmbedded) {
      throw new Error("You cannot prompt for deletion of advancements of an unowned item.");
    }

    if (!this.supportsAdvancements) {
      throw new Error(`The [${this.type}] item type does not support advancements.`);
    }

    const itemIds = new Set([this.id]);
    for (const advancement of this.getEmbeddedPseudoDocumentCollection("Advancement").getByType("itemGrant")) {
      for (const item of advancement.grantedItemsChain()) itemIds.add(item.id);
    }

    const confirm = await artichron.applications.api.Dialog.confirm();
    if (!confirm) return;
    return this.actor.deleteEmbeddedDocuments("Item", Array.from(itemIds));
  }
}
