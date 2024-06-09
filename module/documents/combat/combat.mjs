export default class CombatArtichron extends Combat {
  /** @override */
  setupTurns() {
    const turns = super.setupTurns();
    return this._alternateSort(turns);
  }

  /**
   * Sort combatants, alternating between negative and non-negative disposition.
   * @param {Combatant[]} turns     The normal initiative-defined turn order.
   */
  _alternateSort(turns) {
    if (!turns.length) return;

    const rule = (combatant) => combatant?.token.disposition >= 0;

    const [hostile, friendly] = turns.reduce((acc, combatant) => {
      if (!combatant.token) return acc;
      const friendly = rule(combatant);
      if (friendly) acc[1].push(combatant);
      else acc[0].push(combatant);
      return acc;
    }, [[], []]);
    const [first, second] = rule(turns[0]) ? [friendly, hostile] : [hostile, friendly];

    let newarr = [];
    let i = 0;
    let f = 0;
    let s = 0;

    while (first[i] || second[i]) {
      if (first[i]) {
        newarr.push(first[i]);
      } else if (first.length) {
        newarr.push(first[f]);
        f = (f + 1 === first.length) ? 0 : f + 1;
      }

      if (second[i]) {
        newarr.push(second[i]);
      } else if (second.length) {
        newarr.push(second[s]);
        s = (s + 1 === second.length) ? 0 : s + 1;
      }
      i++;
    }

    return this.turns = newarr;
  }
}
