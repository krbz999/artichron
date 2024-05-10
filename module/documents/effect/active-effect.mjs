export default class ActiveEffectArtichron extends ActiveEffect {
  /** @override */
  async _preCreate(data, options, user) {
    const allowed = await super._preUpdate(data, options, user);
    if (allowed === false) return false;

    if ((this.parent.documentName === "Actor") && (data.type === "fusion")) {
      ui.notifications.warn("ARTICHRON.Warning.InvalidActiveEffectType", {localize: true});
      return false;
    }
  }

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

  getRollData() {
    const data = this.parent.getRollData();
    data.effect = this.system.getRollData();
    data.effect.name = this.name;
    return data;
  }

  /** @override */
  get isSuppressed() {
    if (this.type === "fusion") {
      // If a fusion can be transferred, it does not apply to its parent.
      return this.transferrableFusion;
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
  get transferrableFusion() {
    return this.system.transferrableFusion ?? false;
  }
}
