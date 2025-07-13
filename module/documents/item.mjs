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
        img = artichron.config.EQUIPMENT_TYPES[itemData.system?.armor?.slot].defaultImage ?? "icons/svg/chest.svg";
        break;
      case "elixir":
        img = "icons/svg/explosion.svg";
        break;
      case "part":
        img = "icons/svg/bones.svg";
        break;
      case "path":
        img = "systems/artichron/assets/icons/items/path.svg";
        break;
      case "spell":
        img = "systems/artichron/assets/icons/items/spell.svg";
        break;
      case "talent":
        img = "systems/artichron/assets/icons/items/talent.svg";
        break;
    }
    return img ? { img: img } : super.getDefaultArtwork(itemData);
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
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
   * Does this item have a limited number of uses?
   * @type {boolean}
   */
  get hasUses() {
    return this.system.hasUses ?? false;
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
      const collection = this.getEmbeddedPseudoDocumentCollection("Advancement").getByType("trait");
      const choices = this.flags.artichron?.advancement ?? {};

      const addTraits = traits => {
        for (const trait of traits) {
          this.parent._traits[trait.type] ??= new Set();
          this.parent._traits[trait.type].add(trait);
        }
      };

      for (const adv of collection) {
        if (!adv.isChoice) addTraits(adv.traits);
        else {
          const selected = choices[adv.id]?.selected ?? [];
          const traits = adv.getEmbeddedPseudoDocumentCollection("TraitChoice");
          addTraits(selected.map(id => traits.get(id)).filter(_ => _));
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

    for (const e of this.allApplicableEffects()) {
      if (!e.active) continue;
      changes.push(...e.changes.reduce((acc, change) => {
        const c = foundry.utils.deepClone(change);
        c.effect = e;
        c.priority ??= c.mode * 10;
        acc.push(c);
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
  static async createDialog(data = {}, createOptions = {}, { folders, types, template, context, ...dialogOptions } = {}) {
    const options = artichron.applications.api.Dialog.DEFAULT_OPTIONS;
    const { parent, pack } = createOptions;

    const render = (event, dialog) => {
      const typeInput = dialog.element.querySelector("[name=\"type\"]");

      const nameInput = dialog.element.querySelector("[name=\"name\"]");
      const slotInput = dialog.element.querySelector("[name=\"system.armor.slot\"]");
      const originInput = dialog.element.querySelector("[name=\"system.spell.origin\"]");
      typeInput.addEventListener("change", e => {
        const type = e.currentTarget.value;

        nameInput.placeholder = this.defaultName({ type, parent, pack });

        slotInput.closest(".form-group").classList.toggle("hidden", type !== "armor");
        slotInput.disabled = type !== "armor";

        originInput.closest(".form-group").classList.toggle("hidden", type !== "spell");
        originInput.disabled = type !== "spell";
      });
    };

    context ??= {};
    context.armorSlotOptions = artichron.config.EQUIPMENT_TYPES;
    context.spellOriginOptions = artichron.config.SPELL_ORIGINS;
    template ??= "systems/artichron/templates/sidebar/item-document-create.hbs";

    return super.createDialog(data, createOptions, { folders, types, template, context, render, ...options });
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
