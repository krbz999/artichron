import ActiveEffectSystemModel from "./system-model.mjs";

const { JSONField, StringField } = foundry.data.fields;

/**
 * System data for "Fusions".
 * Fusions are effects that hold data for an item which has been destroyed and fused onto another item.
 * @property {string} itemData      A block of item data for a source item.
 * @property {string} subtype       An item subtype this fusion can apply to.
 */
export default class EffectFusionData extends ActiveEffectSystemModel {
  /**
   * Metadata for this data model.
   * @type {import("../../helpers/types.mjs").ActiveEffectSystemModelMetadata}
   */
  static get metadata() {
    return {
      type: "fusion",
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      itemData: new JSONField(),
      subtype: new StringField({
        required: false,
        choices: () => {
          const choices = foundry.utils.deepClone(CONFIG.Item.typeLabels);
          delete choices.base;
          return choices;
        },
      }),
    };
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The fields this effect may apply to.
   * @type {Set<string>}
   */
  static get BONUS_FIELDS() {
    return this.parent.parent.system.constructor.BONUS_FIELDS;
  }

  /* -------------------------------------------------- */

  /**
   * Is this a fusion that can be transferred?
   * @type {boolean}
   */
  get isTransferrableFusion() {
    return foundry.utils.getType(this.itemData) !== "Object";
  }

  /* -------------------------------------------------- */

  /**
   * Is this a fusion that is currently modifying a target item?
   * @type {boolean}
   */
  get isActiveFusion() {
    return !this.isTransferrableFusion;
  }

  /* -------------------------------------------------- */
  /*   Life-cycle events                                */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preCreate(...T) {
    const allowed = await super._preCreate(...T);
    if (allowed === false) return false;

    const isActor = this.parent.parent.documentName === "Actor";
    const invalidItem = (this.parent.parent.documentName === "Item") && !this.parent.parent.canFuse;
    if (isActor || invalidItem) {
      ui.notifications.warn("ARTICHRON.Warning.InvalidActiveEffectType", { localize: true });
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
    const data = {
      fusion: { ...this.itemData?.system ?? {} },
    };
    data.fusion.name = this.itemData?.name ?? "";
    return data;
  }

  /* -------------------------------------------------- */

  /**
   * Delete this fusion and restore the original item.
   * @param {object} [options]              Options to modify the splitting process.
   * @param {boolean} [options.keepId]      Restore the item with its original id?
   * @returns {Promise<ItemArtichron|null>}
   */
  async unfuse({ keepId = true } = {}) {
    if (!this.isActiveFusion) {
      throw new Error("This is not an active fusion.");
    }

    const item = this.parent.parent;
    if (item instanceof Actor) {
      throw new Error("The fusion effect is living on an actor!");
    }

    const actor = item.isEmbedded ? item.parent : undefined;
    const pack = item.isEmbedded ? undefined : item.pack;

    if (actor?.items.has(this.itemData._id)) keepId = false;
    else if (pack && item.collection.index.has(this.itemData._id)) keepId = false;
    else if (game.items.has(this.itemData._id)) keepId = false;

    await this.parent.delete();
    return getDocumentClass("Item").create(this.itemData, { pack, parent: actor, keepId });
  }

  /* -------------------------------------------------- */

  /**
   * Create a prompt to delete this fusion and restore the original item.
   * @param {object} [options]      Options to modify the splitting process.
   * @returns {Promise<ItemArtichron|null>}
   */
  async unfuseDialog(options = {}) {
    if (!this.isActiveFusion) {
      throw new Error("This is not an active fusion.");
    }

    const confirm = await artichron.applications.api.Dialog.confirm({
      window: {
        title: game.i18n.format("ARTICHRON.ItemFusionDialog.UnfuseTitle", {
          source: this.itemData.name,
          target: this.parent.parent.name,
        }),
        icon: "fa-solid fa-volcano",
      },
      yes: { icon: "fa-solid fa-bolt" },
      modal: true,
    });

    if (!confirm) return null;

    return this.unfuse(options);
  }

  /* -------------------------------------------------- */

  /**
   * Utility method for translating an edge-case change into a human-readable label.
   * @param {object} change           Change effect data.
   * @param {string} change.key       The attribute targeted.
   * @param {number} change.mode      The active effect mode.
   * @param {string} change.value     The new value of the property.
   * @returns {string}                A human-readable label.
   */
  static translateChange({ key, mode, value }) {
    const formatter = game.i18n.getListFormatter({ style: "long", type: "conjunction" });

    // Special case: attributes
    if (key === "system.attributes.value") {
      const values = Array.from(value).map(k => artichron.config.ITEM_ATTRIBUTES[k]?.label).filter(u => u);
      return formatter.format(values);
    }

    throw new Error(`The attempted key '${key}' is an invalid key to translate!`);
  }
}
