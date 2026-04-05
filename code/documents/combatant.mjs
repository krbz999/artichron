import BaseDocumentMixin from "./base-document-mixin.mjs";

/**
 * Base combatant document class.
 * @extends foundry.documents.Combatant
 * @mixes BaseDocumentMixin
 */
export default class CombatantArtichron extends BaseDocumentMixin(foundry.documents.Combatant) {
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
    const cap = 10;
    rollData.pips = Math.floor(Math.min(actor?.actionPoints ?? 0, cap));
    return foundry.dice.Roll.create(formula, rollData);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static async createDocuments(data = [], operation = {}) {
    data.forEach(d => d.type = "artichron");
    return super.createDocuments(data, operation);
  }
}
