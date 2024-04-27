export default class ActiveEffectArtichron extends ActiveEffect {
  async _preCreate(data, options, user) {
    const allowed = await super._preUpdate(data, options, user);
    if (allowed === false) return false;

    if ((this.parent.documentName === "Actor") && (data.type === "fusion")) {
      ui.notifications.warn("ARTICHRON.Warning.InvalidActiveEffectType", {localize: true});
      return false;
    }
  }
}
