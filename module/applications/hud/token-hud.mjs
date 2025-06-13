export default class TokenHUDArtichron extends foundry.applications.hud.TokenHUD {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    actions: {
      effect: {
        handler: TokenHUDArtichron.#onToggleEffect,
        buttons: [0, 2],
      },
      rollDamage: TokenHUDArtichron.#rollDamage,
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

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    if (!this.object.actor?.system.rollDamage) return;

    const button = foundry.utils.parseHTML(`
      <button type="button" class="control-icon" data-action="rollDamage" data-tooltip="ARTICHRON.HUD.TOKEN.rollDamage">
        <i class="fa-solid fa-burst" inert></i>
      </button>`);

    const bar1 = this.element.querySelector(".col.middle .attribute.bar1");
    bar1.insertAdjacentElement("afterend", button);
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Roll damage for every controlled token.
   * @this {TokenHUDArtichron}
   * @param {PointerEvent} event          The initiating click event.
   * @param {HTMLButtonElement} target    The capturing HTML element which defined a [data-action].
   */
  static async #rollDamage(event, target) {
    for (const actor of artichron.utils.getActorTargets(canvas.tokens.controlled, { types: ["hero", "monster"] })) {
      await actor.system.rollDamage({ event });
    }
  }
}
