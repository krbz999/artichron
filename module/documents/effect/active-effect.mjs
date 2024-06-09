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

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.system.prepareDerivedData?.();
  }

  /**
   * Create a prompt to destroy this fusion and create the two base items.
   * @param {object} [options]      Options to modify the splitting process.
   * @returns {Promise<ItemArtichron|null>}
   */
  async unfuseDialog(options = {}) {
    if (this.system.unfuseDialog) return this.system.unfuseDialog(options);
    return null;
  }

  /** @override */
  get isSuppressed() {
    if (this.type === "fusion") {
      // If a fusion can be transferred, it does not apply to its parent.
      return this.isTransferrableFusion;
    }
    return false;
  }

  /** @override */
  get isTemporary() {
    return super.isTemporary || this.system.isTemporary;
  }

  /**
   * Is this a fusion that can be transferred?
   * @type {boolean}
   */
  get isTransferrableFusion() {
    return this.system.isTransferrableFusion ?? false;
  }

  /**
   * Is this a fusion that is currently modifying a target item?
   * @type {boolean}
   */
  get isActiveFusion() {
    return this.system.isActiveFusion ?? false;
  }
}
