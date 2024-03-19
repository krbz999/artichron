export default class MeasuredTemplateArtichron extends MeasuredTemplate {
  /**
   * Reference to a token to which this template is oriented.
   * @type {TokenArtichron}
   */
  token = null;

  /**
   * Reference whether this should be pointed away from an origin, but not attached to it.
   * @type {boolean}
   */
  hasOrigin = false;

  /* -------------------------------------------- */

  /**
   * Track the timestamp when the last mouse move event was captured.
   * @type {number}
   */
  #moveTime = 0;

  /* -------------------------------------------- */

  /**
   * The initially active CanvasLayer to re-activate after the workflow is complete.
   * @type {CanvasLayer}
   */
  #initialLayer;

  /* -------------------------------------------- */

  /**
   * Track the bound event handlers so they can be properly canceled later.
   * @type {object}
   */
  #events;

  /* -------------------------------------------- */

  static fromData(data) {
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
    const template = new cls(templateData, {parent: canvas.scene});
    const object = new this(template);
    return object;
  }

  static fromItem(item) {
    const {type, distance, width, self, angle} = item.system.template;
    const [token] = item.actor.isToken ? [item.actor.token?.object] : item.actor.getActiveTokens();
    const data = {
      t: type,
      distance: distance,
      width: width,
      user: game.user.id,
      fillColor: game.user.color,
      direction: 0,
      angle: angle,
      ...(token ? token.center : {x: 0, y: 0})
    };
    const template = this.fromData(data);
    template.item = item;
    template.token = token ?? null;
    return template;
  }

  /* -------------------------------------------- */

  drawPreview(origin = null) {
    const initialLayer = canvas.activeLayer;
    if (origin) this.origin = origin;
    else if (this.token) this.origin = this.token.center;

    this.hasOrigin = !!this.origin && !this.item?.system.template.self;

    // Draw the template and switch to the template layer
    this.draw();
    this.layer.activate();
    this.layer.preview.addChild(this);

    // Hide the sheet that originated the preview
    this.actorSheet?.minimize();

    // Activate interactivity
    return this.activatePreviewListeners(initialLayer);
  }

  /* -------------------------------------------- */

  /**
   * Activate listeners for the template preview
   * @param {CanvasLayer} initialLayer  The initially active CanvasLayer to re-activate after the workflow is complete
   * @returns {Promise}                 A promise that resolves with the final measured template if created.
   */
  activatePreviewListeners(initialLayer) {
    return new Promise((resolve, reject) => {
      this.#initialLayer = initialLayer;
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
    this.layer._onDragLeftCancel(event);
    canvas.stage.off("mousemove", this.#events.move);
    canvas.stage.off("mousedown", this.#events.confirm);
    canvas.app.view.oncontextmenu = null;
    canvas.app.view.onwheel = null;
    this.#initialLayer.activate();
  }

  /* -------------------------------------------- */

  /**
   * Move the template preview when the mouse moves.
   * @param {Event} event  Triggering mouse event.
   */
  _onMovePlacement(event) {
    event.stopPropagation();
    const now = Date.now(); // Apply a 20ms throttle
    if (now - this.#moveTime <= 20) return;
    let pos;
    if (!this.hasOrigin && this.origin) {
      // The template is attached to the origin at all times.
      pos = {...this.origin};
      const B = event.data.getLocalPosition(this.layer);
      const r = new Ray(pos, B);
      pos.direction = r.angle * 180 / Math.PI;
      // Offset slightly to token edge.
      if (this.token && (this.document.t !== "circle")) {
        const r2 = Ray.towardsPoint(r.A, r.B, this.token.w / 2);
        pos.x = r2.B.x;
        pos.y = r2.B.y;
      }
    } else {
      // Set the x and y at the mouse cursor.
      const center = event.data.getLocalPosition(this.layer);
      const interval = canvas.grid.type === CONST.GRID_TYPES.GRIDLESS ? 0 : 2;
      pos = canvas.grid.getSnappedPosition(center.x, center.y, interval);
    }

    if (this.hasOrigin) {
      // The template points away from the origin at all times.
      const r = new Ray(this.origin, pos);
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
    if (event.ctrlKey) event.preventDefault(); // Avoid zooming the browser window
    event.stopPropagation();
    if (this.origin) return;
    const delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
    const snap = event.shiftKey ? delta : 5;
    const update = {direction: this.document.direction + (snap * Math.sign(event.deltaY))};
    this.document.updateSource(update);
    this.refresh();
  }

  /* -------------------------------------------- */

  /**
   * Confirm placement when the left mouse button is clicked.
   * @param {Event} event  Triggering mouse event.
   */
  async _onConfirmPlacement(event) {
    await this._finishPlacement(event);
    const interval = canvas.grid.type === CONST.GRID_TYPES.GRIDLESS ? 0 : 2;
    const destination = canvas.grid.getSnappedPosition(this.document.x, this.document.y, interval);
    this.document.updateSource(destination);
    this.#events.resolve(MeasuredTemplateDocument.implementation.create(this.document.toObject(), {parent: this.document.parent}));
  }

  /* -------------------------------------------- */

  /**
   * Cancel placement when the right mouse button is clicked.
   * @param {Event} event  Triggering mouse event.
   */
  async _onCancelPlacement(event) {
    await this._finishPlacement(event);
    this.#events.reject(null);
  }
}
