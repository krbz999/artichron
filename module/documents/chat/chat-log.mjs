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
      switch (n.dataset.action) {
        case "applyDamage": n.addEventListener("click", ChatLog._onApplyDamage.bind(message)); break;
        case "placeTemplate": n.addEventListener("click", ChatLog._onPlaceTemplate.bind(message)); break;
        case "grantBuff": n.addEventListener("click", ChatLog._onGrantBuff.bind(message)); break;
        default: break;
      }
    });
  }

  /**
   * Dispatch a click event on all damage targets.
   * @this ChatMessage
   * @param {Event} event     Initiating click event.
   */
  static _onApplyDamage(event) {
    event.currentTarget.closest("[data-message-id]").querySelectorAll("damage-target").forEach(n => {
      n.dispatchEvent(new Event("click"));
    });
  }

  /**
   * Create a measured template from data embedded in a chat message, then perform a damage roll.
   * @this ChatMessage
   * @param {Event} event     Initiating click event.
   */
  static async _onPlaceTemplate(event) {
    const count = this.flags.artichron.use.templateData.count;
    const templates = await this.createMeasuredTemplate(count);
    if (!templates) return null;

    await Promise.all(templates.map(template => template.waitForShape()));

    const uuids = new Set(this.flags.artichron.use.targetUuids);
    for (const template of templates) for (const token of template.object.containedTokens) {
      const uuid = token.actor?.uuid;
      if (uuid) uuids.add(uuid);
    }

    this.setFlag("artichron", "use.targetUuids", Array.from(uuids));
  }

  /**
   * Transfer buffs to targets.
   * @this ChatMessage
   * @param {Event} event     Initiating click event.
   */
  static async _onGrantBuff(event) {
    event.currentTarget.closest("[data-message-id]").querySelectorAll("buff-target").forEach(n => {
      n.dispatchEvent(new Event("click"));
    });
  }
}
