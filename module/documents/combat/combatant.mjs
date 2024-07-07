export default class CombatantArtichron extends Combatant {
  /** @override */
  _getInitiativeFormula() {
    const pips = this.actor.actionPoints ?? 0;
    if (!pips || (this.parent.round <= 1)) return "1d12x";
    else return "1d12x + (@pips)d6";
  }

  /* -------------------------------------------------- */

  /** @override */
  getInitiativeRoll(formula) {
    formula = formula || this._getInitiativeFormula();
    const actor = this.actor;
    const rollData = actor?.getRollData() || {};
    const stamina = actor?.system.pools?.stamina.max ?? 3;
    rollData.pips = Math.min(actor?.actionPoints ?? 0, stamina);
    return Roll.create(formula, rollData);
  }

  /* -------------------------------------------------- */

  /** @override */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    const update = {type: "artichron"};
    this.updateSource(update);
  }
}
