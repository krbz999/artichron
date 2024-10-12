export default class RulerArtichron extends Ruler {
  /** @override */
  _canMove(token) {
    super._canMove(token);
    if (!token.actor) return true;

    if (token.actor.inCombat && (token.document.id !== game.combat.combatant.tokenId)) {
      throw new Error(game.i18n.localize("ARTICHRON.RULER.ERROR.NotYourTurn"));
    }

    const cost = Math.ceil(this.totalCost);
    if (!token.actor.canPerformActionPoints(cost)) {
      throw new Error(game.i18n.format("ARTICHRON.RULER.ERROR.NotEnoughAP", {cost: cost}));
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
      if (this.token?.actor?.inCombat) label += ` (${Math.ceil(this.totalCost)} AP)`;
    } else {
      if (this.token?.actor?.inCombat) label += ` (${Math.ceil(segment.cumulativeCost)} AP)`;
    }
    return label;
  }
}
