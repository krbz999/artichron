export default class TokenArtichron extends Token {
  /**
   * Draw a rounded line to signify a shield and its size.
   */
  drawShield() {
    this.children.find(c => c.name === "tokenShield")?.destroy();
    const items = Object.values(this.actor.arsenal).filter(a => a?.isShield);
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

  /** @inheritdoc */
  _applyRenderFlags(flags) {
    super._applyRenderFlags(flags);
    this.drawShield();
  }
}
