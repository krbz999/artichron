export default class TokenDocumentArtichron extends TokenDocument {
  /**
   * Recall members of a party.
   */
  async recallMembers() {
    const object = this.object;
    if (!object) throw new Error("This token is not visible on the canvas!");

    if (this.actor?.type !== "party") {
      throw new Error("This token document does not belong to a Party actor!");
    }

    const tokens = [];
    for (const { actor } of this.actor.system.members) {
      for (const token of actor.getActiveTokens()) {
        if (!token.actor.isToken) tokens.push(token);
      }
    }

    const options = { autoRotate: true, animation: { duration: 1000, easing: "easeInOutCosine" } };
    await Promise.all(tokens.map(token => token.document.move([{
      x: this.x, y: this.y, elevation: this.elevation,
    }], options)));
    const ids = tokens.map(token => token.id);

    for (const token of tokens) await token.movementAnimationPromise;
    this.parent.deleteEmbeddedDocuments("Token", ids);
  }

  /* -------------------------------------------------- */

  /** @override */
  static getTrackedAttributes(data, _path) {
    let bar;
    switch (data.parent?.type) {
      case "hero":
        bar = [
          ["health"],
          ["pools", "health"],
          ["pools", "stamina"],
          ["pools", "mana"],
        ];
        break;
      case "monster":
        bar = [
          ["health"],
          ["danger", "pool"],
        ];
        break;
      default:
        return super.getTrackedAttributes(data, _path);
    }
    return { bar: bar, value: [] };
  }

  /* -------------------------------------------------- */

  /** @overridde */
  static getTrackedAttributeChoices(...args) {
    const groups = super.getTrackedAttributeChoices(...args);

    for (const g of groups) {
      const string = `ARTICHRON.ACTOR.FIELDS.${g.label}.label`;
      if (g.label.includes("pool")) g.group = "Pools";
      if (game.i18n.has(string)) g.label = game.i18n.localize(string);
    }

    return groups;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preUpdateMovement(movement, operation) {
    if (!this.actor?.system.pips || !this.actor.inCombat) return;
    const resource = this.actor.system.pips.value;
    const distance = movement.passed.cost; // Current segment.
    const consumed = (distance / 5).toNearest(0.2, "ceil");
    if (consumed > resource) {
      ui.notifications.warn("You do not have enough AP.");
      return false;
    }
    await this.actor.update({ "system.pips.value": resource - consumed });
  }
}
