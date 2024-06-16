export default class CombatantArtichron extends Combatant {
  /** @override */
  _getInitiativeFormula() {
    const pips = this.system.pips || 0;
    return pips ? `1d12x>${Math.max(12 - pips, 1)}` : "1d12x";
  }

  /** @override */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    this.updateSource({type: "artichron"});
  }
}
