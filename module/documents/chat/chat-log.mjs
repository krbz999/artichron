import MeasuredTemplateArtichron from "../template/template.mjs";
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
      if (action === "apply-damage") n.addEventListener("click", ChatLog._onApplyDamage.bind(message));
      else if (action === "template") n.addEventListener("click", ChatLog._onTemplate.bind(message));
    });
    html.querySelectorAll(".targets .target").forEach(n => {
      const uuid = n.dataset.tokenUuid;
      const actor = fromUuidSync(uuid)?.actor;
      if (!actor?.isOwner) n.style.opacity = 0.5;
    });
  }

  /**
   * Create a measured template from data embedded in a chat message, then perform a damage roll.
   * @this ChatMessage
   */
  static async _onTemplate() {
    const {itemUuid, templateData} = this.flags.artichron ?? {};
    const item = await fromUuid(itemUuid);
    const actor = item?.actor;
    const [token] = actor?.isToken ? [actor?.token?.object] : actor?.getActiveTokens() ?? [];

    if (!token) return null;

    const template = await MeasuredTemplateArtichron.fromToken(token, templateData).drawPreview();
    await new Promise(r => setTimeout(r, 100));
    const targets = utils.getTokenTargets(utils.tokensInTemplate(template.object));
    return new DamageRoll(templateData.formula, item.getRollData(), {type: templateData.damageType}).toMessage({
      speaker: this.speaker,
      "flags.artichron.targets": targets.map(target => target.uuid),
      "flags.artichron.templateData": {...templateData},
      "flags.artichron.actorUuid": actor.uuid,
      "flags.artichron.itemUuid": item.uuid
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
