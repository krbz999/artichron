export default class TokenDocumentArtichron extends TokenDocument {
  /** @override */
  _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);
    const flags = data.flags?.artichron ?? {};
    const isRedraw = ["hidden", "width", "height"].some(k => k in data);
    if (("aura" in flags) || isRedraw) this.object?.drawAura();
  }

  /** @override */
  async _preUpdate(data, options, user) {
    const allowed = await super._preUpdate(data, options, user);
    if (allowed === false) return false;

    if ((options.animate === false)) return;
    const x = Math.round(data.x ?? this.x);
    const y = Math.round(data.y ?? this.y);
    if (!(this.x - x) && !(this.y - y)) return;
    const ray = new Ray(this, {x, y});
    data.rotation = Math.toDegrees(ray.angle) - 90;
  }
}
