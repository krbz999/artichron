import * as utils from "../../helpers/utils.mjs";
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
    const template = await message.createMeasuredTemplate();
    if (!template) return null;

    await template.waitForShape();
    const targets = template.object.containedTokens;
    const roll = message.rolls[0];
    return new DamageRoll(roll.formula, message.item.getRollData(), {type: roll.options.type}).toMessage({
      speaker: message.speaker,
      "flags.artichron.targets": targets.map(target => target.uuid),
      "flags.artichron.templateData": {...message.flags.artichron.templateData},
      "flags.artichron.actorUuid": message.actor.uuid,
      "flags.artichron.itemUuid": message.item.uuid
    });
  }

  /**
   * Apply damage to targeted tokens' actors.
   * @this ChatMessage
   */
  static _onApplyDamage() {
    let actors = new Set();

    const tokens = canvas.tokens.controlled;
    if (tokens.length) {
      for (const token of tokens) if (token.actor) actors.add(token.actor);
    } else {
      actors = this.flags.artichron.targets.map(uuid => fromUuidSync(uuid)?.actor);
      actors = actors.filter(actor => actor?.isOwner);
    }
    actors.forEach(actor => actor.applyDamage(this.flags.artichron.totals));
  }
}
