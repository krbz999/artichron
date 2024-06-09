export default class TokenDocumentArtichron extends TokenDocument {
  /** @override */
  _onUpdate(data, options, userId) {
    super._onUpdate(data, options, userId);
    const flags = data.flags?.artichron ?? {};
    const isRedraw = ["hidden", "width", "height"].some(k => k in data);
    if (("aura" in flags) || isRedraw) this.object?.drawAura();
  }

  /** @override */
  async _preUpdate(data, options, user) {
    const allowed = await super._preUpdate(data, options, user);
    if (allowed === false) return false;

    if ((options.animate === false)) return;
    const x = Math.round(data.x ?? this.x);
    const y = Math.round(data.y ?? this.y);
    if ((this.x + this.y) - (x + y) === 0) return;
    const ray = new Ray(this, {x, y});
    data.rotation = Math.toDegrees(ray.angle) - 90;
  }

  /** @override */
  static async createCombatants(tokens, {combat} = {}) {
    // Identify the target Combat encounter
    combat ??= game.combats.viewed;
    if (!combat) {
      if (game.user.isGM) {
        const cls = getDocumentClass("Combat");
        combat = await cls.create({scene: canvas.scene.id, active: true}, {render: false});
      }
      else throw new Error(game.i18n.localize("COMBAT.NoneActive"));
    }

    // Add tokens to the Combat encounter
    const createData = tokens.reduce((arr, token) => {
      if (token.inCombat) return arr;
      arr.push({
        tokenId: token.id,
        sceneId: token.parent.id,
        actorId: token.actorId,
        hidden: token.hidden,
        type: (token.actor?.type === "hero") ? "hero" : undefined
      });
      return arr;
    }, []);
    return combat.createEmbeddedDocuments("Combatant", createData);
  }
}
