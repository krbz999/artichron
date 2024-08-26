export default class TokenDocumentArtichron extends TokenDocument {
  /** @override */
  _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);
    return;
    const flags = data.flags?.artichron ?? {};
    const isRedraw = ["hidden", "width", "height"].some(k => k in data);
    if (("aura" in flags) || isRedraw) this.object?.drawAura();
  }

  /* -------------------------------------------------- */

  /** @override */
  async _preUpdate(data, options, user) {
    const allowed = await super._preUpdate(data, options, user);
    if (allowed === false) return false;

    if (data.texture?.src && !options.animation?.transition) {
      foundry.utils.setProperty(options, "animation.transition", TextureTransitionFilter.TYPES.HOLOGRAM);
    }

    return;
    if ((options.animate === false) || (options.teleport === true)) return;
    const x = Math.round(data.x ?? this.x);
    const y = Math.round(data.y ?? this.y);
    if (!(this.x - x) && !(this.y - y)) return;
    const ray = new Ray(this, {x, y});
    data.rotation = Math.toDegrees(ray.angle) - 90;
  }

  /* -------------------------------------------------- */

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
    for (const {actor} of this.actor.system.members) {
      for (const token of actor.getActiveTokens()) {
        if (!token.actor.isToken) tokens.push(token);
      }
    }
    const updates = tokens.map(token => {
      return {_id: token.id, x: this.x, y: this.y};
    });
    await this.parent.updateEmbeddedDocuments("Token", updates, {
      animation: {duration: 1000, easing: "easeInOutCosine"}
    });
    const ids = tokens.map(token => token.id);

    for (const token of tokens) await CanvasAnimation.getAnimation(token.animationName)?.promise;
    this.parent.deleteEmbeddedDocuments("Token", ids);
  }
}
