export default class CombatantArtichron extends Combatant {
  /** @override */
  _getInitiativeFormula() {
    const pips = this.pips;
    return pips ? `1d12x>${Math.max(12 - pips, 1)}` : "1d12x";
  }

  get pips() {
    const pips = this.flags.artichron?.pips ?? 0;
    return Number.isInteger(pips) ? Math.clamp(pips, 0, 12) : 0;
  }
}
