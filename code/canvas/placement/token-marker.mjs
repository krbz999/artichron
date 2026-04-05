/**
 * Utility class to place an interactive marker on a token.
 * @param {foundry.canvas.placeables.Token} token   The token to place the marker on.
 * @param {object} [options]                        Options to configure the marker.
 * @param {string} [options.texture]                Override the texture used.
 * @param {Function} [options.callback]             A callback for when the marker is clicked.
 * @param {string} [options.anchor]                 The anchored position of the marker, relative to the token.
 */
export default class TokenMarker {
  constructor(token, options = {}) {
    this.#id = token.id;
    this.#anchor = options.anchor ?? TokenMarker.ANCHORS.TOP;

    this.#sprite = PIXI.Sprite.from(options.texture ?? TokenMarker.DEFAULT_TEXTURE);
    this.#draw(token.bounds);

    this.#refresh = Hooks.on("refreshToken", token => {
      if (token.id !== this.#id) return;
      this.#draw(token.bounds);
    });

    this.#destroy = Hooks.on("destroyToken", token => {
      if (token.isPreview || (token.id !== this.#id)) return;
      Hooks.off("refreshToken", this.#refresh);
      Hooks.off("destroyToken", this.#destroy);
      canvas.tokens.removeChild(this.#sprite);
    });

    const callback = event => {
      if (options.callback instanceof Function) options.callback(this, event);
      this.#sprite.parent.removeChild(this.#sprite);
      Hooks.off("refreshToken", this.#refresh);
      Hooks.off("destroyToken", this.#destroy);
    };

    this.#sprite.addEventListener("click", callback.bind(this), { capture: true, once: true });
    canvas.tokens.addChild(this.#sprite);
  }

  /* -------------------------------------------------- */

  /**
   * The default texture used unless a different is provided.
   * @type {string}
   */
  static DEFAULT_TEXTURE = "ui/particles/snow.png";

  /* -------------------------------------------------- */

  /**
   * Different anchor positions.
   * @type {Record<string, number>}
   */
  static ANCHORS = Object.freeze({
    TOP_LEFT: 0,
    TOP: 1,
    TOP_CENTER: 1,
    TOP_RIGHT: 2,
    LEFT: 3,
    CENTER_LEFT: 3,
    CENTER: 4,
    CENTER_CENTER: 4,
    RIGHT: 5,
    CENTER_RIGHT: 5,
    BOTTOM_LEFT: 6,
    BOTTOM: 7,
    BOTTOM_CENTER: 7,
    BOTTOM_RIGHT: 8,
  });

  /* -------------------------------------------------- */

  /**
   * Refresh the properties of the sprite.
   * @param {object} bounds
   * @param {number} bounds.x         The x-coordinate of the parent token.
   * @param {number} bounds.y         The y-coordinate of the parent token.
   * @param {number} bounds.width     The width of the parent token.
   * @param {number} bounds.height    The height of the parent token.
   */
  #draw({ x, y, width, height }) {

    const size = canvas.scene.grid.size / 2;
    const update = {
      eventMode: "static",
      cursor: "var(--cursor-pointer)",
      width: size,
      height: size,
    };

    switch (this.#anchor) {
      // // LEFT
      // case 0:
      // case 3:
      // case 6: x = x; break;
      // CENTER
      case 1:
      case 4:
      case 7: x = x + width / 2 - size / 2; break;
      // RIGHT
      case 2:
      case 5:
      case 8: x = x + width - size; break;
    }

    switch (this.#anchor) {
      // // TOP
      // case 0:
      // case 1:
      // case 2: y = y; break;
      // CENTER
      case 3:
      case 4:
      case 5: y = y + height / 2 - size / 2; break;
      // BOTTOM
      case 6:
      case 7:
      case 8: y = y + height - size; break;
    }

    Object.assign(this.#sprite, { ...update, x, y });
  }

  /* -------------------------------------------------- */

  /**
   * The anchor position of the marker relative to the token.
   * @type {string}
   */
  #anchor;
  get anchor() {
    return this.#anchor;
  }

  /* -------------------------------------------------- */

  /**
   * The sprite instance.
   * @type {PIXI.Sprite}
   */
  #sprite;
  get sprite() {
    return this.#sprite;
  }

  /* -------------------------------------------------- */

  /**
   * The token id.
   * @type {string}
   */
  #id;
  get id() {
    return this.#id;
  }

  /* -------------------------------------------------- */

  /**
   * A hook id for when the token refreshes.
   * @type {string}
   */
  #refresh;

  /* -------------------------------------------------- */

  /**
   * A hook id for when the token is destroyed.
   * @type {string}
   */
  #destroy;
}
