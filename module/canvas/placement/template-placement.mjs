export default class TemplatePlacement extends foundry.canvas.placeables.MeasuredTemplate {
  /**
   * Reference to a token to which this template is oriented.
   * @type {TokenArtichron}
   */
  token = null;

  /* -------------------------------------------------- */

  /**
   * Is this a preview currently locked in place?
   * @type {boolean}
   */
  #locked = false;

  /* -------------------------------------------------- */

  /**
   * Template configuration.
   * @type {object}
   */
  config = null;

  /* -------------------------------------------------- */

  /**
   * Template preview options.
   * @type {object}
   */
  options = null;

  /* -------------------------------------------------- */

  /**
   * Track the timestamp when the last mouse move event was captured.
   * @type {number}
   */
  #moveTime = 0;

  /* -------------------------------------------------- */

  /**
   * Track the bound event handlers so they can be properly canceled later.
   * @type {object}
   */
  #events;

  /* -------------------------------------------------- */

  static fromData(data, { lock = false } = {}) {
    // Prepare template data
    const templateData = foundry.utils.mergeObject({
      user: game.user.id,
      direction: 0,
      x: 0,
      y: 0,
      fillColor: game.user.color,
      ...CONFIG.MeasuredTemplate.defaults,
    }, data);
    // Return the template constructed from the item data
    const cls = CONFIG.MeasuredTemplate.documentClass;
    const template = new cls(templateData, { parent: canvas.scene });
    const object = new this(template);
    object.options = {
      lock: lock,
    };
    return object;
  }

  /* -------------------------------------------------- */

  static fromToken(token, { type, size, width, attach, angle = 45, range }, options = {}) {
    if (!token) throw new Error("No token available for placing template!");

    let t = type;
    let distance = size;

    // Increase size of attached circles.
    if (type === "radius") {
      t = "circle";
      distance += token.document.width * canvas.scene.dimensions.distance / 2;
    }

    const mp = canvas.mousePosition;
    const ray = Ray.towardsPoint(token.center, mp, token.w / 2);
    const data = foundry.utils.mergeObject({
      t: t,
      distance: distance,
      width: width,
      user: game.user.id,
      fillColor: game.user.color,
      direction: Math.toDegrees(ray.angle),
      angle: angle,
      ...(attach ? ((t !== "circle") ? ray.B : token.center) : mp),
    }, options.templateData ?? {});

    const template = this.fromData(data, options);
    template.token = token;
    template.config = {
      distance: distance,
      width: width,
      attach: attach,
      angle: angle,
      range: range,
    };
    return template;
  }

  /* -------------------------------------------------- */

  drawPreview() {
    this.origin = this.token.center;

    // Draw the template and switch to the template layer
    this.draw();
    this.layer.activate();
    this.layer.preview.addChild(this);

    // Hide the sheet that originated the preview
    if (this.token?.actor?.sheet?.rendered) this.token.actor.sheet.minimize();

    // Activate interactivity
    return this.activatePreviewListeners();
  }

  /* -------------------------------------------------- */

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
      };

      // Activate listeners
      canvas.stage.addEventListener("pointermove", this.#events.move);
      canvas.stage.addEventListener("pointerdown", this.#events.confirm);
      canvas.stage.addEventListener("pointerdown", this.#events.cancel);
    });
  }

  /* -------------------------------------------------- */

  /**
   * Shared code for when template placement ends by being confirmed or canceled.
   * @param {PointerEvent} event    The initiating click event that ended the placement.
   */
  async _finishPlacement(event) {
    if (!this.#locked) this.layer._onDragLeftCancel(event);
    canvas.stage.removeEventListener("pointermove", this.#events.move);
    canvas.stage.removeEventListener("pointerdown", this.#events.confirm);
    canvas.stage.removeEventListener("pointerdown", this.#events.cancel);
  }

  /* -------------------------------------------------- */

  /**
   * Move the template preview when the mouse moves.
   * @param {PointerEvent} event    The initiating click event.
   */
  _onMovePlacement(event) {
    if (this.#locked) return;
    event.stopPropagation();
    const now = Date.now();
    if (now - this.#moveTime <= 20) return;
    const freeForm = canvas.grid.isGridless || event.shiftKey;
    const cursor = event.data.getLocalPosition(this.layer);

    const ray = new Ray({ ...this.origin }, freeForm ? cursor : canvas.grid.getCenterPoint(cursor));
    const pos = this.config.attach ? ray.A : ray.B;
    pos.direction = Math.toDegrees(ray.angle);

    let pos2;
    if (this.config.attach && (this.document.t !== "circle")) {
      // Offset origin in the cursor direction.
      const offsetDistance = canvas.dimensions.distance * this.token.document.width / 2;
      const offsetDirection = Math.toDegrees(Ray.towardsPoint(ray.A, cursor, this.token.w / 2).angle);
      let origin = canvas.grid.getTranslatedPoint(ray.A, offsetDirection, offsetDistance);
      if (!freeForm) origin = canvas.templates.getSnappedPoint(origin);
      // Point in direction from origin and get snapped point.
      let endPoint = canvas.grid.getTranslatedPoint(origin, offsetDirection, this.config.distance);
      if (!freeForm) endPoint = canvas.templates.getSnappedPoint(endPoint);
      // Get direction.
      const direction = Math.toDegrees(new Ray(origin, endPoint).angle);
      // Update coordinates and direction.
      pos2 = { ...origin, direction: direction };
    } else if (!this.config.attach && (this.config.range > 0)) {
      const r = canvas.grid.measurePath([ray.A, ray.B]).distance;
      const tooFar = r >= this.config.range;
      pos2 = tooFar ? canvas.grid.getTranslatedPoint(ray.A, pos.direction, this.config.range) : cursor;
      if (!freeForm) pos2 = canvas.templates.getSnappedPoint(pos2);
    }

    if (pos2) Object.assign(pos, pos2);

    this.document.updateSource(pos);
    this.refresh();
    this.#moveTime = now;
  }

  /* -------------------------------------------------- */

  /**
   * Confirm placement when the left mouse button is clicked.
   * @param {PointerEvent} event    The initiating click event.
   */
  async _onConfirmPlacement(event) {
    if (event.button !== 0) return;
    if (this.options.lock) this.#locked = true;
    await this._finishPlacement(event);
    const templateData = this.document.toObject();
    const Cls = CONFIG.MeasuredTemplate.documentClass;
    if (this.token?.actor?.sheet?.rendered) this.token.actor.sheet.maximize();
    if (this.#locked) this.#events.resolve(templateData);
    else this.#events.resolve(Cls.create(templateData, { parent: this.document.parent }));
  }

  /* -------------------------------------------------- */

  /**
   * Cancel placement when the right mouse button is clicked.
   * @param {PointerEvent} event    The initiating click event.
   */
  async _onCancelPlacement(event) {
    if (event.button !== 2) return;
    if (!event.shiftKey) return;
    await this._finishPlacement(event);
    this.#events.resolve(null);
  }
}
