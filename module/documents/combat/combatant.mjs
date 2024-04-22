export default class CombatantArtichron extends Combatant {
  /** @override */
  _getInitiativeFormula() {
    const pips = this.pips;
    return pips ? `1d12x>${Math.max(12 - pips, 1)}` : "1d12x";
  }

  get pips() {
    return (this.actor?.type === "hero") ? this.system.pips : 0;
  }
}
