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
    if ((change.key === "name") && (change.value.includes("{_}"))) {
      const name = change.value.replaceAll("{_}", model.name);
      foundry.utils.setProperty(model, "name", name);
      return name;
    } else {
      return super.applyField(model, change, field);
    }
  }
}
