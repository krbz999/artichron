const cap = PIXI.LINE_CAP.ROUND;
const join = PIXI.LINE_JOIN.ROUND;

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
    return this.borderWidth * this.document.height + 1;
  }

  /**
   * The width of the shield when circular.
   * @type {number}
   */
  get shieldWidth() {
    return this.borderWidth * 2;
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
    return this.borderRadius - this.borderWidth / 2 - this.barsWidth / 2;
  }

  /**
   * The radius of the shield when circular.
   * @type {number}
   */
  get shieldRadius() {
    return this.borderRadius + this.borderWidth / 2 + this.shieldWidth / 2;
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
    const items = Object.values(this.actor?.arsenal ?? {}).filter(a => a?.type === "shield");
    if (!items.length) return;
    const value = items.reduce((acc, item) => {
      const w = CONFIG.SYSTEM.SHIELD_TYPES[item.system.category.subtype]?.width ?? 1;
      return acc + w;
    }, 0);
    const radi = Math.clamp(value * (items.length > 1 ? 50 : 60), 0, 300);

    const width = this.shieldWidth;
    const radius = this.shieldRadius;
    const color = {black: 0x000000, fill: 0x999999};

    const shield = this.addChild(new PIXI.Graphics());
    shield.lineStyle({width: width, color: color.black, cap: cap});
    shield.arc(0, 0, radius, Math.toRadians(90 - radi / 2), Math.toRadians(90 + radi / 2));
    shield.angle = this.document.rotation;
    shield.name = "tokenShield";

    const bd = shield.addChild(new PIXI.Graphics());
    bd.lineStyle({width: width / 2, color: color.fill, cap: cap});
    bd.arc(0, 0, radius, Math.toRadians(90 - radi / 2), Math.toRadians(90 + radi / 2));

    shield.position.set(this.w / 2, this.h / 2);
    this.setChildIndex(shield, 2);
  }

  /** Redraw token aura. */
  drawAura() {
    if (this.tokenAuras?.removeChildren) this.tokenAuras.removeChildren().forEach(c => c.destroy());
    if (this.document.hidden && !game.user.isGM) return;

    const aura = this.document.flags.artichron?.aura ?? {};
    if (!aura.distance || !(aura.distance > 0)) return;

    this.tokenAuras ??= canvas.interface.grid.tokenAuras.addChild(new PIXI.Container());
    const shape = this.createAura(aura);
    this.tokenAuras.addChild(shape);
    this.tokenAuras.position.set(...Object.values(this.center));
  }

  /**
   * Create aura PIXI element.
   * @param {object} aura               The aura configuration.
   * @param {number} aura.distance      The range, in grid units.
   * @param {string} aura.color         The color of the aura.
   * @param {number} aura.alpha         The aura opacity.
   * @returns {PIXI}
   */
  createAura({distance, color, alpha}) {
    const shape = new PIXI.Graphics();
    color = Color.from(color);
    const {x, y} = this.center;
    const radius = distance + this.document.width / 2;

    const points = canvas.grid.getCircle({x, y}, radius).reduce((acc, p) => acc.concat(Object.values(p)), []);

    const m = CONFIG.Canvas.polygonBackends.move.create({x, y}, {
      type: "move",
      boundaryShapes: [new PIXI.Polygon(points)],
      debug: false
    });
    shape.lineStyle({width: 3, color: color.subtract(0.5), alpha: alpha});
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
    if (canvas.grid.isHexagonal || !this.isCircular) {
      super._refreshBorder();
      return;
    }

    const thickness = this.borderWidth;
    const radius = this.borderRadius;
    const p = {x: this.w / 2, y: this.h / 2};

    this.border.clear();
    this.border.lineStyle({width: thickness, color: 0x000000, alignment: 0.75, join: PIXI.LINE_JOIN.ROUND});
    this.border.drawCircle(p.x, p.y, radius);
    this.border.lineStyle({width: thickness / 2, color: 0xFFFFFF, alignment: 1, join: PIXI.LINE_JOIN.ROUND});
    this.border.drawCircle(p.x, p.y, radius);
  }

  /** @override */
  _drawBar(number, bar, data) {
    if (!this.isCircular) {
      bar.clear();
      bar.children.forEach(c => c.destroy());
      return super._drawBar(number, bar, data);
    }

    const val = Number(data.value);
    const pct = Math.clamp(val, 0, data.max) / data.max;
    const isZero = number === 0;

    // Determine sizing
    const width = this.barsWidth;
    const radius = this.barsRadius;

    // Determine the color to use
    const color = {black: 0x00000, fill: null};
    if (isZero) color.fill = Color.fromRGB([(1 - (pct / 2)), pct, 0]);
    else color.fill = Color.fromRGB([(0.5 * pct), (0.7 * pct), 0.5 + (pct / 2)]);

    // End point and length variables.
    const d = isZero ? 1 : -1;
    const c = Math.clamp(game.settings.get("artichron", "tokenBarLength"), 30, 180);
    const a = d * (90 + c / 2);
    const b = {
      black: d * (90 - c / 2),
      fill: d * (90 + c * (1 / 2 - pct))
    };
    const p = {x: this.w / 2, y: this.h / 2};

    // Draw the bar
    bar.clear();
    bar.children.forEach(c => c.destroy());
    bar.lineStyle({width: width, color: color.black, cap: cap});
    bar.arc(p.x, p.y, radius, Math.toRadians(a), Math.toRadians(b.black), isZero);

    const hpline = bar.addChild(new PIXI.Graphics());
    hpline.lineStyle({width: width / 2, color: color.fill, cap: cap});
    hpline.arc(p.x, p.y, radius, Math.toRadians(a), Math.toRadians(b.fill), isZero);

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
