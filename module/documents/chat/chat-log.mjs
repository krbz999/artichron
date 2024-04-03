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
    html.querySelectorAll("[data-action]").forEach(n => {
      const action = n.dataset.action;
      if (action === "apply-damage") n.addEventListener("click", ChatLog._onApplyDamage);
    });
    html.querySelectorAll(".targets .target").forEach(n => {
      const uuid = n.dataset.tokenUuid;
      const actor = fromUuidSync(uuid).actor;
      if (!actor.isOwner) n.style.opacity = 0.5;
    });
  }

  /**
   * Apply damage to targeted tokens' actors.
   * @param {Event} event     Initiating click event.
   */
  static _onApplyDamage(event) {
    event.stopImmediatePropagation();
    const message = game.messages.get(event.currentTarget.closest("[data-message-id]").dataset.messageId);

    let actors = new Set();

    const tokens = canvas.tokens.controlled;
    if (tokens.length) {
      for (const token of tokens) if (token.actor) actors.add(token.actor);
    } else {
      actors = message.flags.artichron.targets.map(uuid => fromUuidSync(uuid).actor);
      actors = actors.filter(actor => actor.isOwner);
    }
    actors.forEach(actor => actor.applyDamage(message.flags.artichron.totals));
  }
}
