import ChatMessageSystemModel from "./system-model.mjs";

export default class DamageData extends ChatMessageSystemModel {
  /** @inheritdoc */
  static defineSchema() {
    return {};
  }

  /* -------------------------------------------------- */

  /**
   * Render the HTML for the ChatMessage which should be added to the log
   * @param {object} [options]             Additional options passed to the Handlebars template.
   * @param {boolean} [options.canDelete]  Render a delete button. By default, this is true for GM users.
   * @param {boolean} [options.canClose]   Render a close button for dismissing chat card notifications.
   * @returns {Promise<HTMLElement>}
   */
  async renderHTML(options = {}) {
    const template = "systems/artichron/templates/chat/chat-message.hbs";

    const context = {
      document: this.parent,
      actor: this.parent.speakerActor,
      rolls: [],
      total: 0,
    };

    for (const roll of this.parent.rolls) {
      context.total += roll.total;
      const { icon, label, color } = artichron.config.DAMAGE_TYPES[roll.damageType];
      const dice = [];

      for (const die of roll.dice) {
        for (const result of die.results) {
          const cssClass = [
            "die", `d${die.faces}`,
            (result.result === 1) ? "min" : null,
            (result.result === die.faces) ? "max" : null,
          ].filterJoin(" ");
          dice.push({ cssClass, total: result.result });
        }
      }

      context.rolls.push({
        color, dice, icon, label,
        total: roll.total,
        formula: roll.formula,
        multiplier: (roll.multiplier !== 1) ? roll.multiplier.toNearest(0.01) : null,
      });
    }

    const htmlString = await foundry.applications.handlebars.renderTemplate(template, context);
    const ul = foundry.utils.parseHTML(htmlString);

    const element = ul.firstElementChild;
    this.#applyEventListeners(element);

    return element;
  }

  /* -------------------------------------------------- */

  /**
   * Apply event listeners.
   * @param {HTMLElement} element   The generated html element.
   */
  #applyEventListeners(element) {
    for (const el of element.querySelectorAll(".message-content [data-action]")) {
      switch (el.dataset.action) {
        case "toggleRollsExpanded":
          el.addEventListener("click", () => el.classList.toggle("expanded")); break;
        case "applyDamage":
          el.addEventListener("click", (event) => DamageData.#applyDamage.call(this, event, el)); break;
      }
    }
  }

  /* -------------------------------------------------- */

  /**
   * Calculate the damage to be applied to an actor.
   * @param {foundry.documents.Actor} actor
   * @returns {number}
   */
  calculateDamage(actor) {
    const damages = [];
    for (const roll of this.parent.rolls) {
      const { damageType, total } = roll;
      damages.push({ type: damageType, value: total });
    }
    return actor.calculateDamage(damages, { numeric: true });
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Apply damage to all the token actors.
   * @this {DamageData}
   * @param {PointerEvent} event          The initiating click event.
   * @param {HTMLButtonElement} target    The button that defined the [data-action].
   */
  static #applyDamage(event, target) {
    const damages = [];
    for (const roll of this.parent.rolls) {
      const { damageType, total } = roll;
      damages.push({ type: damageType, value: total });
    }

    const parent = target.closest(".targeting.damage");
    for (const element of parent.querySelectorAll(".target-element")) {
      const actor = fromUuidSync(element.dataset.actorUuid);
      if (!actor) continue;
      actor.applyDamage(damages);
    }
    target.classList.add("button");
  }
}
