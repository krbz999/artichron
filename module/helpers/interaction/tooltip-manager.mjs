/**
 * A class responsible for orchestrating tooltips in the system.
 */
export default class TooltipManagerArtichron extends foundry.helpers.interaction.TooltipManager {
  /* -------------------------------------------------- */
  /*  Properties                                        */
  /* -------------------------------------------------- */

  /**
   * The currently registered observer.
   * @type {MutationObserver}
   */
  #observer;

  /* -------------------------------------------------- */
  /*  Methods                                           */
  /* -------------------------------------------------- */

  /**
   * Initialize the mutation observer.
   */
  observe() {
    this.#observer?.disconnect();
    this.#observer = new MutationObserver(this._onMutation.bind(this));
    this.#observer.observe(this.tooltip, { attributeFilter: ["class"], attributeOldValue: true });
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
    for (const { type, attributeName, oldValue } of mutationList) {
      if ((type === "attributes") && (attributeName === "class")) {
        const difference = new Set(tooltip.classList).difference(new Set(oldValue?.split(" ")));
        if (difference.has("active")) isActive = true;
      }
    }
    if (isActive) this._onTooltipActivate();
  }

  /* -------------------------------------------------- */

  /**
   * Retrieve an item via uuid when hovering over a loading tooltip.
   */
  async _onTooltipActivate() {
    const loading = this.tooltip.querySelector(".loading");
    if (loading?.dataset.uuid) {
      const doc = await fromUuid(loading.dataset.uuid);
      if (doc instanceof Item) this._onHoverItem(doc);
    }
  }

  /* -------------------------------------------------- */

  /**
   * Handle hovering over an item and showing rich tooltips if possible.
   * @param {ItemArtichron} item    The item.
   */
  async _onHoverItem(item) {
    const content = await (item.system.richTooltip?.() ?? {});
    if (!content?.length) return;
    this.tooltip.replaceChildren(...content);
    this.tooltip.classList.add("artichron", "item-tooltip");
    requestAnimationFrame(() => this._positionItemTooltip("RIGHT"));
  }

  /* -------------------------------------------------- */

  /**
   * Position a tooltip after rendering.
   * @param {string} [direction]  The direction to position the tooltip.
   * @protected
   */
  _positionItemTooltip(direction) {
    const Cls = this.constructor;

    if (!direction) {
      direction = Cls.TOOLTIP_DIRECTIONS.LEFT;
      this._setAnchor(direction);
    }

    const pos = this.tooltip.getBoundingClientRect();
    const dirs = Cls.TOOLTIP_DIRECTIONS;
    switch (direction) {
      case dirs.UP:
        if (pos.y - Cls.TOOLTIP_MARGIN_PX <= 0) direction = dirs.DOWN;
        break;
      case dirs.DOWN:
        if (pos.y + this.tooltip.offsetHeight > window.innerHeight) direction = dirs.UP;
        break;
      case dirs.LEFT:
        if (pos.x - Cls.TOOLTIP_MARGIN_PX <= 0) direction = dirs.RIGHT;
        break;
      case dirs.RIGHT:
        if (pos.x + this.tooltip.offsetWidth > window.innerWidth) direction = dirs.LEFT;
        break;
    }

    this._setAnchor(direction);
  }
}
