export default class TokenDocumentArtichron extends TokenDocument {
  /** @override */
  _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);
    const flags = data.flags?.artichron ?? {};
    const isRedraw = ["hidden", "width", "height"].some(k => k in data);
    if (("aura" in flags) || isRedraw) this.object?.drawAura();
  }

  async _preUpdate(data, options, userId) {
    await super._preUpdate(data, options, userId);
    if (this.lockRotation || (options.animate === false)) return;
    if (!("x" in data) && !("y" in data)) return;
    const ray = new Ray(this, {x: data.x ?? this.x, y: data.y ?? this.y});
    data.rotation = ray.angle * 180 / Math.PI - 90;
  }
}
