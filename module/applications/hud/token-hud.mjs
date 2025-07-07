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
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#adjustStatuses();
    this.#addRollDamageButton();
  }

  /* -------------------------------------------------- */

  /** Replace statuses with SVGs. */
  #adjustStatuses() {
    for (const element of this.element.querySelectorAll(".effect-control[data-status-id]")) {
      const el = document.createElement("ARTICHRON-ICON");
      Object.assign(el.dataset, element.dataset);
      el.classList.add(...element.classList);

      let src = element.getAttribute("src");
      if ("levels" in artichron.config.STATUS_CONDITIONS[element.dataset.statusId]) {
        const levels = this.object.actor.effects.get(artichron.utils.staticId(element.dataset.statusId))?.system.level;
        if (levels) src = src.replace(".svg", `-${levels}.svg`);
      }
      el.setAttribute("src", src);

      element.replaceWith(el);
    }
  }

  /* -------------------------------------------------- */

  /** Add a button to roll damage. */
  #addRollDamageButton() {
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
