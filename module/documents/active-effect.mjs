import BaseDocumentMixin from "./base-document-mixin.mjs";

/**
 * Base active effect document class.
 * @extends foundry.documents.ActiveEffect
 * @mixes BaseDocumentMixin
 */
export default class ActiveEffectArtichron extends BaseDocumentMixin(foundry.documents.ActiveEffect) {
  /** @inheritdoc */
  static async createDocuments(data = [], operation = {}) {
    data.forEach(d => d.img ||= "icons/svg/sun.svg");
    return super.createDocuments(data, operation);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static applyField(model, change, field) {
    if (!field) {
      field = change.key.startsWith("system.") ?
        model.system.schema.getField(change.key.slice(7)) :
        model.schema.getField(change.key);
    }

    // Allow prefixes etc for names.
    if ((change.key === "name") && (change.value.includes("{}"))) {
      const name = change.value.replaceAll("{}", model.name);
      foundry.utils.setProperty(model, "name", name);
      return name;
    }

    // Special consideration for set fields.
    else if (field instanceof foundry.data.fields.SetField) {
      const set = foundry.utils.getProperty(model, change.key);
      const values = change.value.matchAll(/(?<remove>-)?(?<key>[a-zA-Z]+)/g);
      for (const { groups: { remove, key } } of values) {
        if (remove) set.delete(key);
        else set.add(key);
      }
      return set;
    }

    else {
      return super.applyField(model, change, field);
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static async _fromStatusEffect(statusId, effectData, options) {
    foundry.utils.mergeObject(effectData, {
      type: "condition",
      "system.primary": statusId,
    });
    const { reference, levels } = artichron.config.STATUS_CONDITIONS[statusId];
    if (reference) effectData.description = `@Embed[${reference} caption=false cite=false inline]`;
    if (levels > 0) effectData.system.level = 1;
    return new this(effectData, options);
  }

  /* -------------------------------------------------- */
  /*   Life-cycle events                                */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  static async createDialog(data = {}, createOptions = {}, { folders, types, template, ...dialogOptions } = {}) {
    const options = artichron.applications.api.Dialog.DEFAULT_OPTIONS;
    return super.createDialog(data, createOptions, { folders, types, template, ...options });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (options.statusLevelDifference) {
      // When a status condition has its level changed, display scrolling status text.
      this._displayScrollingStatus(options.statusLevelDifference > 0);
    }
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Retrieve an object for roll data.
   * @returns {object}
   */
  getRollData() {
    const data = this.parent.getRollData();
    data.effect = this.system.getRollData?.() ?? {};
    data.effect.name = this.name;
    return data;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _displayScrollingStatus(enabled) {
    if (!(this.statuses.size || this.changes.length)) return;
    const actor = this.target;
    const tokens = actor.getActiveTokens(true);
    const text =
    (this.parent.effects.has(this.id) && Number.isInteger(this.system.level)) ?
      `${this.name} (${this.system.level})` :
      `${enabled ? "+" : "-"} ${this.name}`;
    for (let t of tokens) {
      if (!t.visible || t.document.isSecret) continue;
      canvas.interface.createScrollingText(t.center, text, {
        anchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
        direction: enabled ? CONST.TEXT_ANCHOR_POINTS.TOP : CONST.TEXT_ANCHOR_POINTS.BOTTOM,
        distance: (2 * t.h),
        fontSize: 28,
        stroke: 0x000000,
        strokeThickness: 4,
        jitter: 0.25,
      });
    }
  }

  /* -------------------------------------------------- */

  /**
   * Create a prompt to destroy this fusion and create the two base items.
   * @param {object} [options]                Options to modify the splitting process.
   * @returns {Promise<ItemArtichron|null>}   A promise that resolves to the recreated item.
   */
  async unfuseDialog(options = {}) {
    if (this.system.unfuseDialog) return this.system.unfuseDialog(options);
    return null;
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  get isTemporary() {
    return super.isTemporary || this.system.isTemporary;
  }

  /* -------------------------------------------------- */

  /**
   * Is this a fusion that can be transferred?
   * @type {boolean}
   */
  get isTransferrableFusion() {
    return (this.type === "fusion") && this.isSuppressed;
  }

  /* -------------------------------------------------- */

  /**
   * Is this a fusion that is currently modifying a target item?
   * @type {boolean}
   */
  get isActiveFusion() {
    return this.system.isActiveFusion ?? false;
  }
}
