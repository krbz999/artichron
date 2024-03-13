export default class TokenArtichron extends Token {
  /**
   * Draw a rounded line to signify a shield and its size.
   */
  drawShield() {
    this.children.find(c => c.name === "tokenShield")?.destroy();
    const items = Object.values(this.actor?.arsenal ?? {}).filter(a => a?.isShield);
    if (!items.length) return;
    const value = items.reduce((acc, item) => acc + CONFIG.SYSTEM.ARSENAL_TYPES.shield.items[item.system.type.subtype]?.width ?? 1, 0);
    const radi = Math.clamped(value * (items.length > 1 ? 50 : 60), 0, 300);

    const shield = this.addChild(new PIXI.Graphics());
    const tokenSize = canvas.grid.size * this.document.width;
    shield.position.x = 0.5 * tokenSize;
    shield.position.y = 0.5 * tokenSize;
    const radius = 0.5 * Math.sqrt(tokenSize ** 2 + tokenSize ** 2) + 10
    shield.lineStyle({
      alpha: 0.6,
      width: Math.clamped(3 + value * 3, 0, 12),
      color: Color.fromString(game.user.color),
      cap: PIXI.LINE_CAP.ROUND
    });
    shield.arc(0, 0, radius, Math.toRadians(90 - radi / 2), Math.toRadians(90 + radi / 2)); // pointing down (90degrees)
    shield.angle = this.document.rotation;
    shield.name = "tokenShield";
    this.setChildIndex(shield, 0);
  }

  /** Redraw token aura. */
  drawAura() {
    if (this.tokenAuras?.removeChildren) this.tokenAuras.removeChildren().forEach(c => c.destroy());
    if (this.document.hidden && !game.user.isGM) return;

    const aura = this.document.flags.artichron?.aura ?? {};
    if (!aura.distance || !(aura.distance > 0)) return;

    this.tokenAuras ??= canvas.grid.tokenAuras.addChild(new PIXI.Container());
    const shape = this.createAura(aura);
    this.tokenAuras.addChild(shape);
    this.tokenAuras.position.set(...Object.values(this.center));
  }

  /**
   * Create aura PIXI element.
   * @param {object} aura     The aura configuration.
   * @param {number} aura.distance      The range, in grid units.
   * @param {string} aura.color         The color of the aura.
   * @param {number} aura.alpha         The aura opacity.
   * @returns {PIXI}
   */
  createAura({distance, color, alpha}) {
    const shape = new PIXI.Graphics();
    const radius = distance * canvas.dimensions.distancePixels + this.h / 2;
    color = Color.from(color);
    const {x, y} = this.center;

    const m = CONFIG.Canvas.polygonBackends.move.create({x, y}, {
      type: "move",
      hasLimitedRadius: true,
      radius: radius
    });
    shape.beginFill(color, alpha).drawShape(m).endFill();
    shape.pivot.set(x, y);
    return shape;
  }

  /** @override */
  _destroy(...args) {
    super._destroy(...args);
    this.tokenAuras?.destroy();
  }

  /** @inheritdoc */
  _applyRenderFlags(flags) {
    super._applyRenderFlags(flags);
    this.drawShield();
    this.drawAura();
  }
}
