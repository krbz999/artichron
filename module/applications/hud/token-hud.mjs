export default class TokenHUDArtichron extends foundry.applications.hud.TokenHUD {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    actions: {
      effect: {
        handler: TokenHUDArtichron.#onToggleEffect,
        buttons: [0, 2],
      },
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static async #onToggleEffect(event, target) {
    if (!this.actor) {
      ui.notifications.warn("HUD.WarningEffectNoActor", { localize: true });
      return;
    }
    const statusId = target.dataset.statusId;

    const { levels, hud } = artichron.config.STATUS_CONDITIONS[statusId];
    const isLeveled = levels && (levels > 0) && hud;
    const active = isLeveled ? event.button === 0 : undefined;

    await this.actor.toggleStatusEffect(statusId, { active, overlay: event.button === 2 });
  }
}
