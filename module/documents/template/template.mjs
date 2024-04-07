import * as utils from "../../helpers/utils.mjs";

export default class MeasuredTemplateArtichron extends MeasuredTemplate {
  /**
   * Reference to a token to which this template is oriented.
   * @type {TokenArtichron}
   */
  token = null;

  /**
   * Template configuration.
   * @type {object}
   */
  config = null;

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
      ...CONFIG.MeasuredTemplate.defaults
    }, data);
    // Return the template constructed from the item data
    const cls = CONFIG.MeasuredTemplate.documentClass;
    const template = new cls(templateData, {parent: canvas.scene});
    const object = new this(template);
    return object;
  }

  static fromItem(item) {
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
    });
  }

  static fromToken(token, {type, distance, width, attach, angle, range} = {}) {
    if (!token) throw new Error("No token available for placing template!");

    // Increase size of attached circles.
    if ((type === "circle") && attach) {
      distance += token.document.width * canvas.scene.dimensions.distance / 2;
    }

    const data = {
      t: type,
      distance: distance,
      width: width,
      user: game.user.id,
      fillColor: game.user.color,
      direction: 0,
      angle: angle,
      ...token.center
    };

    const template = this.fromData(data);
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
    this.layer._onDragLeftCancel(event);
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
    await this._finishPlacement(event);
    const templateData = this.document.toObject();
    const Cls = CONFIG.MeasuredTemplate.documentClass;
    this.#events.resolve(Cls.create(templateData, {parent: this.document.parent}));
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
}
