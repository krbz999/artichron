export default class TokenHUDArtichron extends CONFIG.Token.hudClass {
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html = html[0];

    for (const [statusId, v] of Object.entries(CONFIG.SYSTEM.STATUS_CONDITIONS)) {
      if (!v.levels || !(v.levels > 1) || !v.hud) continue;
      const img = html.querySelector(`[data-status-id="${statusId}"]`);
      img.addEventListener("click", this._onClickLeveledCondition.bind(this));
      img.addEventListener("contextmenu", this._onContextLeveledCondition.bind(this));

      const id = artichron.utils.staticId(statusId);
      const effect = this.object?.actor?.effects.get(id);
      if (effect) img.dataset.tooltip += ` ${effect.system.level}`;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Override the click events of the token hud for conditions with levels.
   * @param {Event} event     Initiating click event.
   */
  _onClickLeveledCondition(event) {
    const target = event.currentTarget;
    const statusId = target.dataset.statusId;
    if (!target.classList.contains("active")) return;
    const actor = this.object?.actor;
    if (!actor) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const curr = actor.effects.get(artichron.utils.staticId(statusId));
    curr.system.increase();
  }

  /* -------------------------------------------------- */

  /**
   * Override the right-click events of the token hud for conditions with levels.
   * @param {Event} event     Initiating click event.
   */
  _onContextLeveledCondition(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const target = event.currentTarget;
    const statusId = target.dataset.statusId;
    if (!target.classList.contains("active")) return;
    const actor = this.object?.actor;
    if (!actor) return;
    const curr = actor.effects.get(artichron.utils.staticId(statusId));
    const level = curr.system.level;
    if (level > 1) curr.system.decrease();
    else curr.delete();
  }
}
