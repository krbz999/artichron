import ActiveEffectSystemModel from "./system-model.mjs";

const { JSONField, StringField } = foundry.data.fields;

/**
 * System data for "Fusions".
 * Fusions are effects that hold data for an item which has been destroyed and fused onto another item.
 * @property {string} itemData    A block of item data for a source item.
 */
export default class EffectFusionData extends ActiveEffectSystemModel {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {});
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      itemData: new JSONField(),
    });
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * Is there some system logic that makes this active effect ineligible for application?
   * @type {boolean}
   */
  get isSuppressed() {
    // If a fusion has data stored, it is an active fusion and should apply, ergo it should not be suppressed.
    return foundry.utils.getType(this.itemData) !== "Object";
  }

  /* -------------------------------------------------- */
  /*   Life-cycle events                                */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preCreate(data, options, user) {
    if ((await super._preCreate(data, options, user)) === false) return false;

    const parent = this.parent.parent;
    if ((parent.documentName === "Actor") || ((parent.documentName === "Item") && (parent.type !== "armor"))) {
      return false;
    }
  }

  /* -------------------------------------------------- */
  /*   Data preparation                                 */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Fusions never apply to their actor.
    this.parent.transfer = false;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  getRollData() {
    const { name, system } = this.itemData ?? {};
    const data = name ? { fusion: { ...system, name } } : {};
    return data;
  }

  /* -------------------------------------------------- */

  /**
   * Delete this fusion and restore the original item.
   * @param {object} [options]                Options to modify the splitting process.
   * @param {boolean} [options.keepId]        Restore the item with its original id?
   * @returns {Promise<ItemArtichron|null>}   A promise that resolves to the recreated item.
   */
  async unfuse({ keepId = true } = {}) {
    if (this.isSuppressed) {
      throw new Error("This is not an active fusion.");
    }

    const item = this.parent.parent;
    if (item instanceof foundry.documents.Actor) {
      throw new Error("The fusion effect is living on an actor!");
    }

    const actor = item.isEmbedded ? item.parent : undefined;
    const pack = item.isEmbedded ? undefined : item.pack;

    if (actor?.items.has(this.itemData._id)) keepId = false;
    else if (pack && item.collection.index.has(this.itemData._id)) keepId = false;
    else if (game.items.has(this.itemData._id)) keepId = false;

    await this.parent.delete();
    return foundry.utils.getDocumentClass("Item").create(this.itemData, { pack, parent: actor, keepId });
  }

  /* -------------------------------------------------- */

  /**
   * Create a prompt to delete this fusion and restore the original item.
   * @param {object} [options]                Options to modify the splitting process.
   * @returns {Promise<ItemArtichron|null>}   A promise that resolves to the recreated item.
   */
  async unfuseDialog(options = {}) {
    if (this.isSuppressed) {
      throw new Error("This is not an active fusion.");
    }

    const confirm = await artichron.applications.api.Dialog.confirm({
      window: {
        title: game.i18n.format("ARTICHRON.FUSION.titleUnfuse", {
          spell: this.itemData.name,
          armor: this.parent.parent.name,
        }),
        icon: "fa-solid fa-volcano",
      },
      yes: { icon: "fa-solid fa-bolt" },
    });

    if (!confirm) return null;

    return this.unfuse(options);
  }
}
