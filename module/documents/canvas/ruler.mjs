export default class RulerArtichron extends CONFIG.Canvas.rulerClass {
  /** @override */
  _canMove(token) {
    super._canMove(token);
    if (!token.actor) return true;
    const cost = Math.ceil(this.totalCost);
    if (!token.actor.canPerformActionPoints(cost)) {
      throw new Error(`This movement would require at least ${cost} Action Points.`);
    }
    return true;
  }

  /* -------------------------------------------------- */

  /** @override */
  async _postMove(token) {
    if (token.actor?.inCombat) {
      return token.actor.spendActionPoints(Math.ceil(this.totalCost));
    }
  }

  /* -------------------------------------------------- */

  /** @override */
  _getCostFunction() {
    return (from, to, distance) => {
      const cost = (distance / 5);
      return cost;
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  _getSegmentLabel(segment) {
    if (segment.teleport) return "";
    const units = canvas.grid.units;
    let label = `${Math.round(segment.distance * 10) / 10}`;
    if (units) label += ` ${units}`;
    if (segment.last) {
      label += ` [${Math.round(this.totalDistance * 10) / 10}`;
      if (units) label += ` ${units}`;
      label += "]";
      if (this.token?.actor?.inCombat) label += ` (${Math.ceil(this.totalCost * 10) / 10} AP)`;
    } else {
      if (this.token?.actor?.inCombat) label += ` (${Math.ceil(segment.cumulativeCost * 10) / 10} AP)`;
    }
    return label;
  }
}
