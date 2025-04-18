export default class CombatantArtichron extends foundry.documents.Combatant {
  /** @inheritdoc */
  _getInitiativeFormula() {
    const pips = this.actor?.actionPoints ?? 0;
    if (!pips || (this.parent.round <= 1)) return "1d12x";
    else return "1d12x + (@pips)d6";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  getInitiativeRoll(formula) {
    formula = formula || this._getInitiativeFormula();
    const actor = this.actor;
    const rollData = actor?.getRollData() || {};

    let cap;
    switch (actor?.type) {
      case "hero":
        cap = actor.system.pools.stamina.max;
        break;
      case "monster":
        cap = actor.system.danger.value * 3;
        break;
      default:
        cap = 3;
        break;
    }

    rollData.pips = Math.min(actor?.actionPoints ?? 0, cap);
    return Roll.create(formula, rollData);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static async createDocuments(data = [], operation = {}) {
    data.forEach(d => d.type = "artichron");
    return super.createDocuments(data, operation);
  }
}
