/**
 * A subclass of the token ruler class that will eventually be responsible for
 * - subtracting AP equal to one fifth of the distance after a token moves.
 * - preventing token movement when it is not the token's combatant's turn or if they cannot afford the movement.
 * - showing the AP cost as a label on the ruler and each waypoint.
 * With v13, these things except the label are found elsewhere.
 */
export default class TokenRulerArtichron extends foundry.canvas.placeables.tokens.TokenRuler {
  /** @inheritdoc */
  static WAYPOINT_LABEL_TEMPLATE = "systems/artichron/templates/hud/waypoint-label.hbs";

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _getWaypointLabelContext(waypoint, state) {
    const result = super._getWaypointLabelContext(waypoint, state);
    if (!result) return result;
    const p = waypoint.previous;
    if (!p) return result;
    const segment = (p.previous) || (waypoint.stage !== "passed") ? this.token.getAPCost(waypoint.cost) : null;
    const total = this.token.getAPCost(waypoint.measurement.cost);
    Object.assign(result, { AP: { segment, total } });
    return result;
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
