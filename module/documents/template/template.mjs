import * as utils from "../../helpers/utils.mjs";

export default class MeasuredTemplateArtichron extends MeasuredTemplate {
  static SYSTEM_SHAPES = {
    STAR: "star",
    CLOVER: "clover",
    TEE: "tee"
  };

  /**
   * Reference to a token to which this template is oriented.
   * @type {TokenArtichron}
   */
  token = null;

  /* -------------------------------------------- */

  /**
   * Is this a preview currently locked in place?
   * @type {boolean}
   */
  #locked = false;

  /* -------------------------------------------- */

  /**
   * Template configuration.
   * @type {object}
   */
  config = null;

  /* -------------------------------------------- */

  /**
   * Template preview options.
   * @type {object}
   */
  options = null;

  /* -------------------------------------------- */

  /**
   * Track the timestamp when the last mouse move event was captured.
   * @type {number}
   */
  #moveTime = 0;

  /* -------------------------------------------- */

  /**
   * Track the bound event handlers so they can be properly canceled later.
   * @type {object}
   */
  #events;

  /* -------------------------------------------- */

  static fromData(data, {lock = false} = {}) {
    // Prepare template data
    const templateData = foundry.utils.mergeObject({
      user: game.user.id,
      direction: 0,
      x: 0,
      y: 0,
      fillColor: game.user.color,
      ...CONFIG.MeasuredTemplate.defaults
    }, data);
    // Return the template constructed from the item data
    const cls = CONFIG.MeasuredTemplate.documentClass;
    const template = new cls(templateData, {parent: canvas.scene});
    const object = new this(template);
    object.options = {
      lock: lock
    };
    return object;
  }

  static fromItem(item, options = {}) {
    const {type, distance, width, self, angle, range} = item.system.template;
    const [token] = item.actor.isToken ? [item.actor.token?.object] : item.actor.getActiveTokens();
    if (!token) throw new Error("No token available for placing template!");

    return this.fromToken(token, {
      type: type,
      distance: distance,
      width: width,
      angle: angle,
      attach: self,
      range: range
    }, options);
  }

  static fromToken(token, {type, distance, width, attach, angle, range} = {}, options = {}) {
    if (!token) throw new Error("No token available for placing template!");

    let t = type;

    // Increase size of attached circles.
    if ((type === "radius") || (type === "bang")) {
      t = "circle";
      if (type === "bang") type = "star";
      distance += token.document.width * canvas.scene.dimensions.distance / 2;
    } else if (type === "star") {
      t = "circle";
    } else if (type === "tee") {
      t = "cone";
    }

    const data = {
      t: t,
      distance: distance,
      width: width,
      user: game.user.id,
      fillColor: game.user.color,
      direction: 0,
      "flags.artichron.t": type,
      angle: angle,
      ...token.center
    };

    const template = this.fromData(data, options);
    template.token = token;
    template.config = {
      distance: distance,
      width: width,
      attach: attach,
      angle: angle,
      range: range
    };
    return template;
  }

  /* -------------------------------------------- */

  drawPreview() {
    this.origin = this.token.center;

    // Draw the template and switch to the template layer
    this.draw();
    this.layer.activate();
    this.layer.preview.addChild(this);

    // Hide the sheet that originated the preview
    this.actorSheet?.minimize();

    // Activate interactivity
    return this.activatePreviewListeners();
  }

  /* -------------------------------------------- */

  /**
   * Activate listeners for the template preview
   * @returns {Promise}                 A promise that resolves with the final measured template if created.
   */
  activatePreviewListeners() {
    return new Promise((resolve, reject) => {
      this.#events = {
        cancel: this._onCancelPlacement.bind(this),
        confirm: this._onConfirmPlacement.bind(this),
        move: this._onMovePlacement.bind(this),
        resolve,
        reject,
        rotate: this._onRotatePlacement.bind(this)
      };

      // Activate listeners
      canvas.stage.on("mousemove", this.#events.move);
      canvas.stage.on("mousedown", this.#events.confirm);
      canvas.app.view.oncontextmenu = this.#events.cancel;
      canvas.app.view.onwheel = this.#events.rotate;
    });
  }

  /* -------------------------------------------- */

  /**
   * Shared code for when template placement ends by being confirmed or canceled.
   * @param {Event} event  Triggering event that ended the placement.
   */
  async _finishPlacement(event) {
    if (!this.#locked) this.layer._onDragLeftCancel(event);
    canvas.stage.off("mousemove", this.#events.move);
    canvas.stage.off("mousedown", this.#events.confirm);
    canvas.app.view.oncontextmenu = null;
    canvas.app.view.onwheel = null;
  }

  /* -------------------------------------------- */

  /**
   * Move the template preview when the mouse moves.
   * @param {Event} event  Triggering mouse event.
   */
  _onMovePlacement(event) {
    if (this.#locked) return;
    event.stopPropagation();
    const now = Date.now(); // Apply a 20ms throttle
    if (now - this.#moveTime <= 20) return;
    let pos;
    if (this.config.attach) {
      // The template is attached to the origin at all times.
      pos = {...this.origin};
      const B = event.data.getLocalPosition(this.layer);
      const r = new Ray(pos, B);
      pos.direction = r.angle * 180 / Math.PI;
      // Offset slightly to token edge.
      if (this.document.t !== "circle") {
        const r2 = Ray.towardsPoint(r.A, r.B, this.token.w / 2);
        pos.x = r2.B.x;
        pos.y = r2.B.y;
      }
    } else {
      // Set the x and y at the mouse cursor.
      pos = {...event.data.getLocalPosition(this.layer)};
      const r = new Ray(this.origin, pos);
      const dp = canvas.dimensions.distancePixels;
      const distance = canvas.grid.measureDistance(this.origin, pos);

      if ((this.config.range > 0) && (distance > this.config.range)) {
        const r2 = Ray.fromAngle(this.origin.x, this.origin.y, r.angle, this.config.range * dp);
        pos.x = r2.B.x;
        pos.y = r2.B.y;
      }
      pos.direction = r.angle * 180 / Math.PI;
    }

    this.document.updateSource(pos);
    this.refresh();
    this.#moveTime = now;
  }

  /* -------------------------------------------- */

  /**
   * Rotate the template preview by 3˚ increments when the mouse wheel is rotated.
   * @param {Event} event  Triggering mouse event.
   */
  _onRotatePlacement(event) {
    return;
  }

  /* -------------------------------------------- */

  /**
   * Confirm placement when the left mouse button is clicked.
   * @param {Event} event  Triggering mouse event.
   */
  async _onConfirmPlacement(event) {
    if (this.options.lock) this.#locked = true;
    await this._finishPlacement(event);
    const templateData = this.document.toObject();
    const Cls = CONFIG.MeasuredTemplate.documentClass;
    if (this.#locked) this.#events.resolve(templateData);
    else this.#events.resolve(Cls.create(templateData, {parent: this.document.parent}));
  }

  /* -------------------------------------------- */

  /**
   * Cancel placement when the right mouse button is clicked.
   * @param {Event} event  Triggering mouse event.
   */
  async _onCancelPlacement(event) {
    await this._finishPlacement(event);
    this.#events.resolve(null);
  }

  /* -------------------------------------------- */

  /**
   * Get targets contained within this template.
   * @returns {TokenDocumentArtichron[]}
   */
  get containedTokens() {
    const tokens = utils.tokensInTemplate(this);
    return utils.getTokenTargets(tokens);
  }

  static getCloverShape(distance) {
    const px = distance;// * canvas.dimensions.distancePixels;

    const shape = canvas.primary.addChild(new PIXI.Graphics());
    shape.lineStyle(4, 0x000000, 0.75);
    shape
      .arc(0, -px, px / 2, Math.toRadians(166), Math.toRadians(14))
      .arc(0, 0, px, Math.toRadians(300), Math.toRadians(330))
      .arc(px, 0, px / 2, Math.toRadians(256), Math.toRadians(104))
      .arc(0, 0, px, Math.toRadians(30), Math.toRadians(60))
      .arc(0, px, px / 2, Math.toRadians(346), Math.toRadians(194))
      .arc(0, 0, px, Math.toRadians(120), Math.toRadians(150))
      .arc(-px, 0, px / 2, Math.toRadians(76), Math.toRadians(284))
      .arc(0, 0, px, Math.toRadians(210), Math.toRadians(240))
      .closePath();

    const c1 = ClockwiseSweepPolygon.create({x: -100, y: 0}, {radius: 150, hasLimitedRadius: true});
    const c2 = ClockwiseSweepPolygon.create({x: 100, y: 0}, {radius: 150, hasLimitedRadius: true});
    return new PIXI.Polygon(c1.points.concat(c2.points));

    console.warn(shape, shape.geometry.points);
    return new PIXI.Polygon(shape.geometry.points);
  }

  static getStarShape(direction, distance) {
    const rays = Array.fromRange(5).flatMap(n => {
      const angle = Math.toRadians(n * 360 / 5) + direction;
      const angle2 = Math.toRadians(n * 360 / 5 + 36) + direction;
      return [Ray.fromAngle(0, 0, angle, distance), Ray.fromAngle(0, 0, angle2, distance / 2)];
    });

    const points = rays.flatMap(ray => [ray.B.x, ray.B.y]);
    return new PIXI.Polygon(points);
  }

  static getTeeShape(direction, distance, width) {
    const dp = canvas.dimensions.distancePixels;

    const OH = Ray.fromAngle(0, 0, direction - Math.toRadians(90), (width / 2) + 1);
    const OA = Ray.fromAngle(0, 0, direction + Math.toRadians(90), (width / 2) + 1);

    const AB = Ray.fromAngle(OA.B.x, OA.B.y, direction, distance + 1);
    const HG = Ray.fromAngle(OH.B.x, OH.B.y, direction, distance + 1);

    const BC = Ray.fromAngle(AB.B.x, AB.B.y, direction + Math.toRadians(90), Math.abs(dp / 2 - distance) + 1);
    const CD = Ray.fromAngle(BC.B.x, BC.B.y, direction, dp + 1);

    const GF = Ray.fromAngle(HG.B.x, HG.B.y, direction - Math.toRadians(90), Math.abs(dp / 2 - distance) + 1);
    const FE = Ray.fromAngle(GF.B.x, GF.B.y, direction, dp + 1);

    const points = [
      AB.A.x, AB.A.y,
      AB.B.x, AB.B.y,
      BC.B.x, BC.B.y,
      CD.B.x, CD.B.y,
      FE.B.x, FE.B.y,
      FE.A.x, FE.A.y,
      GF.A.x, GF.A.y,
      HG.A.x, HG.A.y
    ];
    return new PIXI.Polygon(points);
  }

  /** @override */
  _computeShape() {
    let {angle, width, x, y} = this.document;
    const {angle: direction, distance} = this.ray;
    width *= canvas.dimensions.distancePixels;
    const t = this.document.flags.artichron?.t ?? null;
    if (t === "star") return this.constructor.getStarShape(direction, distance);
    else if (t === "clover") return this.constructor.getCloverShape(distance);
    else if (t === "tee") return this.constructor.getTeeShape(direction, distance, width);
    else return super._computeShape();
  }
}
