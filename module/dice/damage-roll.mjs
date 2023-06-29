// A helper class to combine several rolls into one, each with a damage type.
export class DamageRoll {
  constructor(parts, data = {}, options = {}) {
    this.rolls = parts.reduce((acc, part) => {
      const opts = foundry.utils.deepClone(options);
      opts.type = part.type;
      const roll = new _DamageRoll(part.value, data, opts);
      acc.push(roll);
      return acc;
    }, []);
    this._total = null;
  }

  async evaluate() {
    await Promise.all(this.rolls.map(roll => roll.evaluate()));
    this._total = this.rolls.reduce((acc, roll) => acc + roll.total, 0);
    return this;
  }

  async toMessage(messageData = {}, {rollMode, create = true, split = false} = {}) {
    if (!this._evaluated) await this.evaluate();
    const totals = this.totals;
    messageData["flags.artichron.totals"] = totals;
    if (!split) {
      const terms = this.rolls.reduce((acc, roll) => {
        if (acc.length) {
          const op = new OperatorTerm({operator: "+"});
          op._evaluated = true;
          acc.push(op);
        }
        return acc.concat(roll.terms);
      }, []);
      return Roll.fromTerms(terms).toMessage(messageData, {rollMode, create});
    }
    else {
      messageData = {
        "flags.artichron.totals": totals,
        rolls: this.rolls,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL
      };
      ChatMessage.applyRollMode(messageData, game.settings.get("core", "rollMode"));
      return ChatMessage.create(messageData);
    }
  }

  get _evaluated() {
    return this.rolls.every(roll => roll._evaluated);
  }

  getFormula() {
    return this.rolls.map(roll => roll.formula).join(" + ");
  }

  get total() {
    return this._total;
  }

  get totals() {
    if (!this._evaluated) return null;
    return this.rolls.reduce((acc, roll) => {
      acc[roll.damageType] ??= 0;
      acc[roll.damageType] += roll.total;
      return acc;
    }, {});
  }
}

export class _DamageRoll extends Roll {
  constructor(formula, data = {}, options = {}) {
    const type = options.type;
    if (!type) throw new Error("A damage roll was constructed without a type.");
    super(formula, data, options);
    this.type = type;
  }

  get damageType() {
    return this.type;
  }
}
