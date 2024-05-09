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

  getRollData({async = false} = {}) {
    return this.system.getRollData?.({async}) ?? {};
  }

  /** @override */
  get isSuppressed() {
    if (this.type === "fusion") {
      return !this.system.source;
    }
    return false;
  }

  /** @override */
  get isTemporary() {
    return super.isTemporary || this.system.isTemporary;
  }
}
