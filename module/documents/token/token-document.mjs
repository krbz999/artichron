export default class TokenDocumentArtichron extends TokenDocument {
  /** @override */
  _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);
    const flags = data.flags?.artichron ?? {};
    const isRedraw = ["hidden", "width", "height"].some(k => k in data);
    if (("aura" in flags) || isRedraw) this.object?.drawAura();
  }

  async _preUpdate(data, options, user) {
    await super._preUpdate(data, options, user);
    if ((options.animate === false)) return;

    const moveX = ("x" in data) && (data.x !== this.x);
    const moveY = ("y" in data) && (data.y !== this.y);
    if (!moveX && !moveY) return;
    const ray = new Ray(this, {x: data.x ?? this.x, y: data.y ?? this.y});
    data.rotation = Math.toDegrees(ray.angle) - 90;
  }
}
