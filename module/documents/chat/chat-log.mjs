import {DamageRoll} from "../../dice/damage-roll.mjs";

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
      if (action === "apply-damage") n.addEventListener("click", () => message.applyDamage());
      else if (action === "template") n.addEventListener("click", ChatLog._onTemplate);
    });
    html.querySelectorAll(".targets .target").forEach(n => {
      const uuid = n.dataset.tokenUuid;
      const actor = fromUuidSync(uuid)?.actor;
      if (!actor?.isOwner) n.style.opacity = 0.5;
    });
  }

  /**
   * Create a measured template from data embedded in a chat message, then perform a damage roll.
   * @param {Event} event     Initiating click event.
   */
  static async _onTemplate(event) {
    const message = game.messages.get(event.currentTarget.closest("[data-message-id]").dataset.messageId);
    const count = message.flags.artichron.templateData.count;
    const templates = await message.createMeasuredTemplate(count);
    if (!templates) return null;

    await Promise.all(templates.map(template => template.waitForShape()));

    let targets = new Set();
    for (const t of templates) for (const tok of t.object.containedTokens) targets.add(tok);
    targets = Array.from(targets);

    let rolls = [];
    const src = message.toObject();

    if (message.rolls.length) {
      const {formula, options: {type}} = message.rolls.length[0];
      rolls = [new DamageRoll(formula, message.item.getRollData(), {type: type})];
    }

    return DamageRoll.toMessage(rolls, {
      speaker: src.speaker,
      "flags.artichron.targets": targets.map(target => target.uuid),
      "flags.artichron.templateData": {...message.flags.artichron.templateData},
      "system.actor": src.system.actor,
      "system.item": src.system.item,
      type: src.type
    });
  }
}
