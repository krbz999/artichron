/**
 * A class responsible for orchestrating tooltips in the system.
 */
export default class TooltipsArtichron {
  /* -------------------------------------------------- */
  /*  Properties                                        */
  /* -------------------------------------------------- */

  /**
   * The currently registered observer.
   * @type {MutationObserver}
   */
  #observer;

  /* -------------------------------------------------- */

  /**
   * The tooltip element.
   * @type {HTMLElement}
   */
  get tooltip() {
    return document.getElementById("tooltip");
  }

  /* -------------------------------------------------- */
  /*  Methods                                           */
  /* -------------------------------------------------- */

  /**
   * Initialize the mutation observer.
   */
  observe() {
    this.#observer?.disconnect();
    this.#observer = new MutationObserver(this._onMutation.bind(this));
    this.#observer.observe(this.tooltip, {attributeFilter: ["class"], attributeOldValue: true});
  }

  /* -------------------------------------------------- */

  /**
   * Handle a mutation event.
   * @param {MutationRecord[]} mutationList  The list of changes.
   * @protected
   */
  _onMutation(mutationList) {
    let isActive = false;
    const tooltip = this.tooltip;
    for (const {type, attributeName, oldValue} of mutationList) {
      if ((type === "attributes") && (attributeName === "class")) {
        const difference = new Set(tooltip.classList).difference(new Set(oldValue?.split(" ")));
        if (difference.has("active")) isActive = true;
      }
    }
    if (isActive) this._onTooltipActivate();
  }

  /* -------------------------------------------------- */

  /**
   * Handle tooltip activation.
   * @protected
   * @returns {Promise}
   */
  async _onTooltipActivate() {
    const loading = this.tooltip.querySelector(".loading");

    // Sheet-specific tooltips
    if (loading?.dataset.uuid) {
      const doc = await fromUuid(loading.dataset.uuid);
      if (doc instanceof Item) return this._onHoverItem(doc);
    }
  }

  /* -------------------------------------------------- */

  /**
   * Handle hovering over an item and showing rich tooltips if possible.
   * @param {ItemArtichron} item      The item.
   */
  async _onHoverItem(item) {
    const {content, classes} = await (item.system.richTooltip?.() ?? {});
    if (!content) return;
    this.tooltip.innerHTML = content.outerHTML;
    classes?.forEach(c => this.tooltip.classList.add(c));
    requestAnimationFrame(() => this._positionItemTooltip("RIGHT"));
  }

  /* -------------------------------------------------- */

  /**
   * Position a tooltip after rendering.
   * @param {string} [direction]  The direction to position the tooltip.
   * @protected
   */
  _positionItemTooltip(direction) {
    if (!direction) {
      direction = TooltipManager.TOOLTIP_DIRECTIONS.LEFT;
      game.tooltip._setAnchor(direction);
    }

    const pos = this.tooltip.getBoundingClientRect();
    const dirs = TooltipManager.TOOLTIP_DIRECTIONS;
    switch (direction) {
      case dirs.UP:
        if (pos.y - TooltipManager.TOOLTIP_MARGIN_PX <= 0) direction = dirs.DOWN;
        break;
      case dirs.DOWN:
        if (pos.y + this.tooltip.offsetHeight > window.innerHeight) direction = dirs.UP;
        break;
      case dirs.LEFT:
        if (pos.x - TooltipManager.TOOLTIP_MARGIN_PX <= 0) direction = dirs.RIGHT;
        break;
      case dirs.RIGHT:
        if (pos.x + this.tooltip.offsetWidth > window.innerWith) direction = dirs.LEFT;
        break;
    }

    game.tooltip._setAnchor(direction);
  }

  /* -------------------------------------------------- */

  /**
   * Intercept middle-click listeners to prevent scrolling behavior inside a locked tooltip when attempting to lock
   * another tooltip.
   */
  static activateListeners() {
    document.addEventListener("pointerdown", event => {
      if (event.button !== 1) return;
      const cl = game.tooltip.tooltip.classList;
      if (event.target.closest(".item-tooltip, .locked-tooltip")) {
        event.preventDefault();
      } else if (cl.contains("item-tooltip") && cl.contains("active")) {
        event.preventDefault();
      }
    }, {capture: true});
  }
}
