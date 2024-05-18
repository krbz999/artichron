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
        case "applyDamage": n.addEventListener("click", () => message.applyDamage()); break;
        case "placeTemplate": n.addEventListener("click", ChatLog._onPlaceTemplate.bind(message)); break;
        case "grantBuff": n.addEventListener("click", ChatLog._onGrantBuff.bind(message)); break;
        default: break;
      }
    });
    html.querySelectorAll(".targets .target").forEach(n => {
      const uuid = n.dataset.actorUuid;
      const actor = fromUuidSync(uuid);
      if (!actor?.isOwner) n.style.opacity = 0.5;
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

    let targets = new Set();
    for (const template of templates) for (const token of template.object.containedTokens) {
      const actor = token.actor;
      if (actor) targets.add(actor);
    }
    targets = Array.from(targets);

    let rolls = [];
    const src = this.toObject();

    if (this.rolls.length) {
      const {formula, options: {type}} = this.rolls[0];
      rolls = [new DamageRoll(formula, this.item.getRollData(), {type: type})];
    }

    return DamageRoll.toMessage(rolls, {
      speaker: src.speaker,
      "flags.artichron.use.targetUuids": targets.map(target => target.uuid),
      "flags.artichron.use.templateData": {...this.flags.artichron.use.templateData},
      "system.actor": src.system.actor,
      "system.item": src.system.item,
      type: src.type
    });
  }

  /**
   * Transfer buffs to targets.
   * @this ChatMessage
   * @param {Event} event     Initiating click event.
   */
  static async _onGrantBuff(event) {
    const effect = await fromUuid(this.flags.artichron.use.effectUuid);
    const promises = this.flags.artichron.use.targetUuids.map(uuid => fromUuid(uuid));
    let actors = await Promise.all(promises);
    actors = new Set(actors.filter(a => a?.isOwner));
    for (const actor of actors) artichron.utils.sockets.grantBuff(effect, actor);
  }
}
