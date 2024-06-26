export default class ActiveEffectArtichron extends ActiveEffect {
  /** @override */
  static applyField(model, change, field) {
    if ((change.key === "name") && (change.value.includes("{{}}"))) {
      const name = change.value.replaceAll("{{}}", model.name);
      foundry.utils.setProperty(model, "name", name);
      return name;
    } else {
      return super.applyField(model, change, field);
    }
  }

  /* -------------------------------------------------- */

  /** @override */
  static async _fromStatusEffect(statusId, effectData, options) {
    foundry.utils.mergeObject(effectData, {
      type: "condition",
      "system.primary": statusId
    });
    const {reference, levels} = CONFIG.SYSTEM.STATUS_CONDITIONS[statusId];
    if (reference) effectData.description = `@Embed[${reference} caption=false cite=false inline]`;
    if (levels > 0) effectData.system.level = 1;
    return new this(effectData, options);
  }

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

  /**
   * Create a prompt to destroy this fusion and create the two base items.
   * @param {object} [options]      Options to modify the splitting process.
   * @returns {Promise<ItemArtichron|null>}
   */
  async unfuseDialog(options = {}) {
    if (this.system.unfuseDialog) return this.system.unfuseDialog(options);
    return null;
  }

  /* -------------------------------------------------- */

  /** @override */
  get isSuppressed() {
    if (this.type === "fusion") {
      // If a fusion can be transferred, it does not apply to its parent.
      return this.isTransferrableFusion;
    }
    return false;
  }

  /* -------------------------------------------------- */

  /** @override */
  get isTemporary() {
    return super.isTemporary || this.system.isTemporary;
  }

  /* -------------------------------------------------- */

  /**
   * Is this a fusion that can be transferred?
   * @type {boolean}
   */
  get isTransferrableFusion() {
    return this.system.isTransferrableFusion ?? false;
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
