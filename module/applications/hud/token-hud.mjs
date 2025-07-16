export default class TokenHUDArtichron extends foundry.applications.hud.TokenHUD {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    actions: {
      effect: {
        handler: TokenHUDArtichron.#onToggleEffect,
        buttons: [0, 2],
      },
      rollDamage: TokenHUDArtichron.#rollDamage,
      placeMembers: TokenHUDArtichron.#placeMembers,
      recallMembers: TokenHUDArtichron.#recallMembers,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#adjustStatuses();
    this.#addRollDamageButton();
    this.#addMembersButtons();
  }

  /* -------------------------------------------------- */

  /** Replace statuses with SVGs. */
  #adjustStatuses() {
    const palette = this.element.querySelector(".palette.status-effects");

    const statuses = {
      toggles: [],
      leveled: [],
      buffs: [],
    };

    for (const element of palette.querySelectorAll(".effect-control[data-status-id]")) {
      const config = artichron.config.STATUS_CONDITIONS[element.dataset.statusId];
      const group = config.group;

      const el = document.createElement("ARTICHRON-ICON");
      Object.assign(el.dataset, element.dataset);
      el.classList.add(...element.classList);

      let src = element.getAttribute("src");
      if ("levels" in config) {
        const levels = this.actor.effects.get(artichron.utils.staticId(element.dataset.statusId))?.system.level;
        if (levels) src = src.replace(".svg", `-${levels}.svg`);
      }
      el.setAttribute("src", src);

      switch (group) {
        case "toggle": statuses.toggles.push(el); break;
        case "leveled": statuses.leveled.push(el); break;
        case "buff": statuses.buffs.push(el); break;
      }
    }

    let html = "<div class='effects toggles'>";
    for (const k of statuses.toggles) html += k.outerHTML;
    html += "</div><div class='effects leveled'>";
    for (const k of statuses.leveled) html += k.outerHTML;
    html += "</div><div class='effects buffs'>";
    for (const k of statuses.buffs) html += k.outerHTML;
    html += "</div>";

    palette.innerHTML = html;
  }

  /* -------------------------------------------------- */

  /** Add a button to roll damage. */
  #addRollDamageButton() {
    if (!this.actor?.system.rollDamage) return;

    const button = foundry.utils.parseHTML(`
      <button type="button" class="control-icon" data-action="rollDamage" data-tooltip="ARTICHRON.HUD.TOKEN.rollDamage">
        <i class="fa-solid fa-burst" inert></i>
      </button>`);

    const bar1 = this.element.querySelector(".col.middle .attribute.bar1");
    bar1.insertAdjacentElement("afterend", button);
  }

  /* -------------------------------------------------- */

  #addMembersButtons() {
    if (this.actor?.type !== "party") return;

    const buttons = foundry.utils.parseHTML(`
      <button type="button" class="control-icon" data-action="placeMembers" data-tooltip="ARTICHRON.HUD.TOKEN.placeMembers">
        <i class="fa-solid fa-street-view" inert></i>
      </button>
      <button type="button" class="control-icon" data-action="recallMembers" data-tooltip="ARTICHRON.HUD.TOKEN.recallMembers">
        <i class="fa-solid fa-rotate-right" inert></i>
      </button>`);

    const bar1 = this.element.querySelector(".col.middle .attribute.bar1");
    bar1.after(...buttons);
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

  /* -------------------------------------------------- */

  static #placeMembers(event, target) {
    this.actor.system.placeMembers();
  }

  static #recallMembers(event, target) {
    this.document.recallMembers();
  }
}
