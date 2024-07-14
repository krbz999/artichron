import ActiveEffectSystemModel from "./system-model.mjs";

const {JSONField, StringField} = foundry.data.fields;

/**
 * System data for "Fusions".
 * Fusions are effects that hold data for an item which has been destroyed and fused onto another item.
 * @property {string} itemData      A block of item data for a source item.
 * @property {string} subtype       An item subtype this fusion can apply to.
 */
export default class EffectFusionData extends ActiveEffectSystemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      itemData: new JSONField(),
      subtype: new StringField({
        required: true,
        blank: false,
        initial: "weapon",
        label: "ARTICHRON.EffectProperty.SubtypeFusion",
        hint: "ARTICHRON.EffectProperty.SubtypeFusionHint",
        choices: () => {
          const choices = foundry.utils.deepClone(CONFIG.Item.typeLabels);
          delete choices.base;
          return choices;
        }
      })
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

  /** @override */
  async _preCreate(...T) {
    const allowed = await super._preCreate(...T);
    if (allowed === false) return false;

    const isActor = this.parent.parent.documentName === "Actor";
    const invalidItem = (this.parent.parent.documentName === "Item") && !this.parent.parent.canFuse;
    if (isActor || invalidItem) {
      ui.notifications.warn("ARTICHRON.Warning.InvalidActiveEffectType", {localize: true});
      return false;
    }
  }

  /* -------------------------------------------------- */
  /*   Data preparation                                 */
  /* -------------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Fusions never apply to their actor.
    this.parent.transfer = false;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @override */
  getRollData() {
    const data = {
      fusion: {...this.itemData?.system ?? {}}
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
  async unfuse({keepId = true} = {}) {
    if (!this.isActiveFusion) {
      throw new Error("This is not an active fusion.");
    }

    const item = this.parent.parent;
    if (item instanceof Actor) {
      throw new Error("The fusion effect is living on an actor!");
    }

    const actor = item.isEmbedded ? item.parent : undefined;
    const pack = item.isEmbedded ? undefined : item.compendium?.metadata.id ?? undefined;

    if (actor && actor.items.has(this.itemData._id)) keepId = false;
    else if (item.compendium && item.compendium.index.has(this.itemData._id)) keepId = false;
    else if (game.items.has(this.itemData._id)) keepId = false;

    await this.parent.delete();
    return getDocumentClass("Item").create(this.itemData, {pack, parent: actor, keepId});
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

    const confirm = await foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.format("ARTICHRON.ItemFusionDialog.UnfuseTitle", {
          source: this.itemData.name,
          target: this.parent.parent.name
        }),
        icon: "fa-solid fa-volcano"
      },
      yes: {icon: "fa-solid fa-bolt"},
      rejectClose: false,
      modal: true
    });

    if (!confirm) return null;

    return this.unfuse(options);
  }

  /* -------------------------------------------------- */

  /**
   * Utility method for translating a change into a human-readable label.
   * @param {object} change
   * @param {string} change.key
   * @param {number} change.mode
   * @param {string} change.value
   * @returns {string}
   */
  static translateChange({key, mode, value}) {
    if (mode === CONST.ACTIVE_EFFECT_MODES.ADD) mode = "ADD";
    else if (mode === CONST.ACTIVE_EFFECT_MODES.OVERRIDE) mode = "OVERRIDE";
    else if (mode === CONST.ACTIVE_EFFECT_MODES.UPGRADE) mode = "OVERRIDE";

    let locale;
    let options;

    // Special cases: resistances
    if (key.startsWith("system.resistances.")) {
      const [, , type] = key.split(".");
      locale = `ARTICHRON.ItemFusionChanges.Resistance.${mode}`;
      options = {change: value, type: type};
    }

    // Special case: damage
    else if (key === "system.damage.parts") {
      value = JSON.parse(`[${value}]`);
      value = Array.isArray(value) ? value : [value];

      const formatter = new Intl.ListFormat("en", {style: "long", type: "conjunction"});
      const list = formatter.format(value.map(({formula, type}) => {
        return `${formula} ${CONFIG.SYSTEM.DAMAGE_TYPES[type].label}`;
      }));

      locale = `ARTICHRON.ItemFusionChanges.Damage.${mode}`;
      options = {change: list};
    }

    // Special case: wielding
    else if (key.startsWith("system.wield.")) {
      value = parseInt(value);
      locale = `ARTICHRON.ItemFusionChanges.${value === 1 ? "Wield" : "WieldPl"}.${mode}`;
    }

    // Regular cases
    else {
      const map = {
        name: "Name",
        img: "Image",
        "system.price.value": "Price",
        "system.weight.value": "Weight",
        "system.armor.value": "Armor",
        "system.range.value": "Range",
        "system.range.reach": "Reach",
        "system.cost.value": "Action Point Cost",
        "system.damage.parts": "Damage"
      }[key];
      locale = `ARTICHRON.ItemFusionChanges.${map}.${mode}`;
      options = {change: value};
    }

    if (game.i18n.has(locale)) return game.i18n.format(locale, options);
    throw new Error(`The attempted key '${key}' is an invalid key to translate!`);
  }

  /* -------------------------------------------------- */

  /**
   * Attempt to translate the changes of this fusion into something human-readable.
   * @returns {string[]}      Readable labels.
   */
  translateChanges() {
    const labels = [];
    for (const change of this.parent.changes) {
      try {
        const label = this.constructor.translateChange(change);
        labels.push(label);
      } catch (err) {
        console.warn(err);
      }
    }
    return labels;
  }
}
