/**
 * A subclass of the token ruler class that will eventually be responsible for
 * - subtracting AP equal to one fifth of the distance after a token moves.
 * - preventing token movement when it is not the token's combatant's turn or if they cannot afford the movement.
 * - showing the AP cost as a label on the ruler and each waypoint.
 * With v13, these things except the label are found elsewhere.
 */
export default class TokenRulerArtichron extends foundry.canvas.placeables.tokens.TokenRuler {
  /** @inheritdoc */
  _getWaypointLabel(waypoint) {
    let { text, alpha, scale } = super._getWaypointLabel(waypoint);
    if (!this.token.actor?.inCombat) return { text, alpha, scale };
    text = [
      text,
      `${this.token.getAPCost(waypoint.measurement.cost)} AP`,
    ].filterJoin(" ");
    return { text, alpha, scale };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _getSegmentStyle(waypoint) {
    let { width, color, alpha } = super._getSegmentStyle(waypoint);

    if (this.token.actor?.inCombat) {
      const cost = this.#calculateCostFromWaypoint(waypoint, waypoint.stage);
      if (!this.token.actor.canPerformActionPoints(this.token.getAPCost(cost))) color = 0xFF0000;
    }

    return { width, color, alpha };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _getGridHighlightStyle(waypoint, offset) {
    let { color, alpha } = super._getGridHighlightStyle(waypoint, offset);

    if (this.token.actor?.inCombat) {
      const cost = this.#calculateCostFromWaypoint(waypoint, waypoint.stage);
      if (!this.token.actor.canPerformActionPoints(this.token.getAPCost(cost))) color = 0xFF0000;
    }

    return { color, alpha };
  }

  /* -------------------------------------------------- */

  /**
   * Get the cost of the segments that are not passed.
   * @param {object} waypoint     The current waypoint.
   * @param {}
   * @returns {number}
   */
  #calculateCostFromWaypoint(waypoint, type) {
    const previous = this.#calcPrevious(waypoint.previous, type);
    return ((waypoint.stage === "passed") ? 0 : waypoint.cost) + previous;
  }
  #calcPrevious(waypoint, type) {
    if (!waypoint) return 0;
    return (waypoint.stage === "passed") || ((type === "planned") && (waypoint.stage !== "planned"))
      ? 0
      : waypoint.cost + this.#calcPrevious(waypoint.previous, type);
  }
}
