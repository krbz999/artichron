import ChatMessageSystemModel from "./system-model.mjs";

const { ArrayField, DocumentUUIDField, NumberField, SchemaField } = foundry.data.fields;

export default class DamageData extends ChatMessageSystemModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      damaged: new ArrayField(new SchemaField({
        actorUuid: new DocumentUUIDField({ type: "Actor" }),
        amount: new NumberField({ min: 0, integer: true, nullable: false, initial: null }),
      })),
    };
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
          el.addEventListener("click", (event) => {
            const results = DamageData.#applyDamage.call(this, event, el);
            this.#applyResults(results);
          });
          break;
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

  /**
   * Store damage values after applying damage.
   * @param {Promise[]} promises    Array of promises that resolve to objects with actor uuid and the applied damage.
   * @returns {Promise<void>}       A promise that resolves once this chat message has been updated.
   */
  async #applyResults(promises) {
    promises = await Promise.all(promises);
    const damaged = foundry.utils.deepClone(this._source.damaged);
    for (const result of promises) {
      const existing = damaged.find(d => d.actorUuid === result.actorUuid);
      if (existing) existing.amount = result.amount;
      else damaged.push(result);
    }
    await this.parent.update({ "system.damaged": damaged });
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Apply damage to all the token actors.
   * @this {DamageData}
   * @param {PointerEvent} event          The initiating click event.
   * @param {HTMLButtonElement} target    The button that defined the [data-action].
   * @returns {Array<Promise<object>>}    An array of promises with actor uuid and the amount applied.
   */
  static #applyDamage(event, target) {
    const damages = [];
    for (const roll of this.parent.rolls) {
      const { damageType, total } = roll;
      damages.push({ type: damageType, value: total });
    }

    const promises = [];
    const parent = target.closest(".targeting.damage");
    for (const element of parent.querySelectorAll(".target-element")) {
      const actor = fromUuidSync(element.dataset.actorUuid);
      if (!actor) continue;
      promises.push(async function() {
        const value = actor.system.health.value;
        await actor.applyDamage(damages);
        const delta = value - actor.system.health.value;
        return { actorUuid: actor.uuid, amount: delta };
      }());
    }
    return promises;
  }
}
