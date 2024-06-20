const staticId = id => {
  if (id.length >= 16) return id.substring(0, 16);
  return id.padEnd(16, "0");
};

export default class TokenHUDArtichron extends CONFIG.Token.hudClass {
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html = html[0];

    for (const [statusId, {levels}] of Object.entries(CONFIG.SYSTEM.STATUS_CONDITIONS)) {
      if (!levels || !(levels > 1)) continue;
      const img = html.querySelector(`[data-status-id="${statusId}"]`);
      img.addEventListener("click", this._onClickLeveledCondition.bind(this));
      img.addEventListener("contextmenu", this._onContextLeveledCondition.bind(this));

      const id = staticId(statusId);
      const effect = this.object?.actor?.effects.get(id);
      if (effect) img.dataset.tooltip += ` ${effect.system.level}`;
    }
  }

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
    event.stopImmediatePropagation();
    const curr = actor.effects.get(staticId(statusId));
    const max = CONFIG.SYSTEM.STATUS_CONDITIONS[statusId].levels;
    const level = curr.system.level;
    if (level === max) return;
    curr.update({"system.level": Math.min(curr.system.level + 1, max)});
    curr._displayScrollingStatus(true);
  }

  /**
   * Override the right-click events of the token hud for conditions with levels.
   * @param {Event} event     Initiating click event.
   */
  _onContextLeveledCondition(event) {
    const target = event.currentTarget;
    const statusId = target.dataset.statusId;
    if (!target.classList.contains("active")) return;
    const actor = this.object?.actor;
    if (!actor) return;
    const curr = actor.effects.get(staticId(statusId));
    const level = curr.system.level;
    if (level > 1) {
      event.stopImmediatePropagation();
      curr.update({"system.level": Math.max(level - 1, 1)});
      curr._displayScrollingStatus(false);
    }
  }
}
