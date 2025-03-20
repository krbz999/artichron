export default class TokenLayerArtichron extends foundry.canvas.layers.TokenLayer {
  /** @inheritdoc */
  async undoHistory() {
    const event = this.history.at(-1);
    const result = await super.undoHistory();

    for (const data of event?.data ?? []) {
      const actor = this.get(data._id).actor;
      const pips = data._pips;
      if (!pips || !actor) continue;
      await actor.update({ "system.pips.value": actor.system.pips.value + pips });
    }

    return result;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  storeHistory(type, data, options) {
    for (const d of data) {
      Object.defineProperty(d, "_pips", {
        get: function() {
          return options[d._id]?.pips;
        },
      });
    }
    super.storeHistory(type, data, options);
  }
}
