const cap = PIXI.LINE_CAP.ROUND;

export default class TokenArtichron extends Token {
  /**
   * The width of the selection border when circular.
   * @type {number}
   */
  get borderWidth() {
    return CONFIG.Canvas.objectBorderThickness;
  }

  /**
   * The width of the token bars when circular.
   * @type {number}
   */
  get barsWidth() {
    let h = Math.max((canvas.dimensions.size / 12), 8);
    if (this.document.height >= 2) h *= 1.6;
    return h;
  }

  /**
   * The width of the shield when circular.
   * @type {number}
   */
  get shieldWidth() {
    return this.barsWidth / 2;
  }

  /**
   * The radius of the selection border when circular.
   * @type {number}
   */
  get borderRadius() {
    return Math.max(this.h, this.w) / 2 + this.borderWidth;
  }

  /**
   * The radius of the token bars when circular.
   * @type {number}
   */
  get barsRadius() {
    return this.borderRadius + this.borderWidth / 2 + this.barsWidth / 2;
  }

  /**
   * The radius of the shield when circular.
   * @type {number}
   */
  get shieldRadius() {
    return this.barsRadius + this.barsWidth / 2 + this.shieldWidth / 2;
  }

  /**
   * Is this token circular (equal width and height)?
   * @type {boolean}
   */
  get isCircular() {
    return this.document.width === this.document.height;
  }

  /** Draw a rounded line to signify a shield and its size. */
  drawShield() {
    this.children.filter(c => c.name === "tokenShield").forEach(n => n.destroy());
    const items = Object.values(this.actor?.arsenal ?? {}).filter(a => a?.isShield);
    if (!items.length) return;
    const value = items.reduce((acc, item) => {
      const w = CONFIG.SYSTEM.ARSENAL_TYPES.shield.items[item.system.type.subtype]?.width ?? 1;
      return acc + w;
    }, 0);
    const radi = Math.clamped(value * (items.length > 1 ? 50 : 60), 0, 300);

    const width = this.shieldWidth;
    const radius = this.shieldRadius;
    const color = {black: 0x000000, fill: 0x999999};

    const shield = this.addChild(new PIXI.Graphics());
    shield.lineStyle({width: width, color: color.black, cap: cap});
    shield.arc(0, 0, radius, Math.toRadians(90 - radi / 2), Math.toRadians(90 + radi / 2));
    shield.angle = this.document.rotation;
    shield.name = "tokenShield";

    const bd = shield.addChild(new PIXI.Graphics());
    bd.lineStyle({width: width - 2, color: color.fill, cap: cap});
    bd.arc(0, 0, radius, Math.toRadians(90 - radi / 2), Math.toRadians(90 + radi / 2));

    shield.position.set(this.w / 2, this.h / 2);
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

  /** @override */
  _applyRenderFlags(flags) {
    super._applyRenderFlags(flags);
    this.drawShield();
    this.drawAura();
  }

  /** @override */
  _refreshBorder() {
    if (canvas.grid.isHex || !this.isCircular) return super._refreshBorder();
    const b = this.border;
    b.clear();

    // Determine the desired border color
    const borderColor = this._getBorderColor();
    if (!borderColor) return;

    const radius = this.borderRadius;
    const width = this.borderWidth;
    b.lineStyle(width, 0x000000, 0.8).drawCircle(this.w / 2, this.h / 2, radius);
    b.lineStyle(width - 2, borderColor, 1).drawCircle(this.w / 2, this.h / 2, radius);
  }

  /** @override */
  _drawBar(number, bar, data) {
    if (!this.isCircular) {
      bar.clear();
      bar.children.forEach(c => c.destroy());
      return super._drawBar(number, bar, data);
    }

    const val = Number(data.value);
    const pct = Math.clamped(val, 0, data.max) / data.max;

    // Determine sizing
    const width = this.barsWidth;
    const radius = this.barsRadius;

    // Determine the color to use
    const color = {black: 0x00000, fill: null};
    if (number === 0) color.fill = Color.fromRGB([(1 - (pct / 2)), pct, 0]);
    else color.fill = Color.fromRGB([(0.5 * pct), (0.7 * pct), 0.5 + (pct / 2)]);

    // End point and length variables.
    const o = (number === 0) ? 0 : 180;
    const c = 130;
    const a = 180 - (180 - c) / 2 + o;
    const b = {black: a - c, fill: a - c * pct};
    const counter = true;

    // Draw the bar
    bar.clear();
    bar.children.forEach(c => c.destroy());
    bar.lineStyle({width: width, color: color.black, cap: cap});
    bar.arc(this.w / 2, this.h / 2, radius, Math.toRadians(a), Math.toRadians(b.black), counter);

    const hpline = bar.addChild(new PIXI.Graphics());
    hpline.lineStyle({width: width - 2, color: color.fill, cap: cap});
    hpline.arc(this.w / 2, this.h / 2, radius, Math.toRadians(a), Math.toRadians(b.fill), counter);

    bar.position.set(0, 0);

    return true;
  }

  /** @override */
  _getTextStyle() {
    const style = super._getTextStyle().clone();
    style._fontFamily = "Arial";
    style._strokeThickness = 2;
    style._stroke = "#000000";
    style._dropShadowBlur = 1;
    style._fontSize = 20;
    return style;
  }
}
