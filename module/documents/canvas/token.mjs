export default class TokenArtichron extends foundry.canvas.placeables.Token {
  /** @inheritdoc */
  _getAnimationTransition(options) {
    return foundry.canvas.rendering.filters.TextureTransitionFilter.TYPES.HOLOGRAM;
  }

  /* -------------------------------------------------- */

  /**
   * Get the cost of a distance.
   * @param {number} distance     The distance to move, after any modifiers.
   * @returns {number}            The AP cost, a multiple of 0.2.
   */
  getAPCost(distance) {
    return (distance / 5).toNearest(0.2, "ceil");
  }
}
