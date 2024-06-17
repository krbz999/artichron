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

    let firstC;
    const [hostile, friendly] = turns.reduce((acc, combatant) => {
      if (!combatant.token) return acc;
      const friendly = rule(combatant);
      if (friendly) acc[1].push(combatant);
      else acc[0].push(combatant);
      firstC ??= combatant;
      return acc;
    }, [[], []]);
    const [first, second] = rule(firstC) ? [friendly, hostile] : [hostile, friendly];

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

  /** @override */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    if (game.user.id === userId) this.expireCombatEffects();
  }

  /**
   * Delete any effects that expire when combat ends.
   * @returns {Promise<ActiveEffectArtichron[]>}      All the deleted effects.
   */
  async expireCombatEffects() {
    const actors = new Set(this.combatants.map(c => c.actor));
    const deleted = [];

    const loop = doc => {
      const ids = [];
      for (const effect of doc.appliedEffects) {
        if (effect.system.expiration.type === "combat") ids.push(effect.id);
      }
      return ids;
    };

    const deleteEffects = async (doc, ids) => {
      const del = await doc.deleteEmbeddedDocuments("ActiveEffect", ids);
      deleted.push(...del);
      return true;
    };

    for (const actor of actors) {
      if (!actor) continue;

      const ids = loop(actor);
      if (ids.length) await deleteEffects(actor, ids);

      for (const item of actor.items) {
        const ids = loop(item);
        if (ids.length) deleteEffects(item, ids);
      }
    }

    return deleted;
  }
}
