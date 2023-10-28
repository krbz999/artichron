export class ChatLog {
  static init() {
    Hooks.on("renderChatMessage", ChatLog.renderChatMessage);
  }

  /**
   * Hook onto rendered chat messages and apply listeners.
   * @param {ChatMessage} message
   * @param {HTMLElement} html
   */
  static renderChatMessage(message, [html]) {
    html.querySelectorAll(".damage-roll").forEach(n => {
      n.addEventListener("click", ChatLog._onDiceRollClick);
    });
    html.querySelectorAll("[data-action]").forEach(n => {
      const action = n.dataset.action;
      if (action === "apply-damage") n.addEventListener("click", ChatLog._onApplyDamage);
    });
  }

  /**
   * Expand and collapse dice rolls.
   * @param {PointerEvent} event
   */
  static _onDiceRollClick(event) {
    event.preventDefault();
    const roll = event.currentTarget;
    roll.querySelectorAll(".damage-roll-tooltip").forEach(tip => {
      const has = tip.classList.contains("expanded");
      if (has) $(tip).slideUp(200);
      else $(tip).slideDown(200);
      tip.classList.toggle("expanded");
    });
  }

  /**
   * Apply damage to selected tokens' actors.
   * @param {PointerEvent} event
   */
  static _onApplyDamage(event) {
    event.stopImmediatePropagation();
    const message = game.messages.get(event.currentTarget.closest("[data-message-id]").dataset.messageId);
    const totals = message.flags.artichron.totals;
    const type = event.currentTarget.closest("[data-type]").dataset.type;
    const actors = canvas.tokens.controlled.reduce((acc, token) => {
      if (token.actor) acc.add(token.actor);
      return acc;
    }, new Set());
    const data = (type === "all") ? totals : {[type]: Number(event.currentTarget.closest("[data-total]").dataset.total)};
    actors.forEach(actor => actor.applyDamage(data));
  }
}
