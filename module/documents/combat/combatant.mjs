export default class CombatantArtichron extends Combatant {
  /** @override */
  _getInitiativeFormula() {
    const pips = this.system.pips || 0;
    if (!pips) return "1d12x5=12";
    if (pips < 10) return `1d12x5>=${12 - pips}`;
    return "1d12x5>=1";
  }

  /** @override */
  getInitiativeRoll(formula) {
    formula = formula || this._getInitiativeFormula();
    const rollData = this.actor?.getRollData() || {};
    rollData.pips = this.system.pips || 0;
    return Roll.create(formula, rollData);
  }

  /** @override */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;
    const pools = this.actor.system.pools;
    const hindered = this.actor.appliedConditionLevel("hindered");
    const update = {
      type: "artichron",
      system: {
        pips: Math.max(pools.health.max + Math.max(pools.stamina.max, pools.mana.max) - hindered, 1)
      }
    };
    this.updateSource(update);
  }
}
