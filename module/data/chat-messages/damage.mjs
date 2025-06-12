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
   * Static map to help store expanded states across re-renders.
   * @type {Record<string, object>}
   */
  static #expandedStates = {};

  /* -------------------------------------------------- */

  /**
   * Query method to delegate methods.
   * @type {Function}
   */
  static _query = ({ type, config }) => {
    switch (type) {
      case "undoDamage": return DamageData.#undoDamageQuery(config);
      case "applyDamage": return DamageData.#applyDamageQuery(config);
    }
  };

  /* -------------------------------------------------- */

  /**
   * Query method for applying damage via chat message.
   * @param {object} queryData
   * @param {string} queryData.messageId      The id of the chat message with targets.
   * @param {string[]} queryData.actorUuids   The uuids of the actors to apply damage to.
   * @returns {Promise<boolean>}              A promise that resolves once damage has been applied and the message updated.
   */
  static async #applyDamageQuery({ messageId, actorUuids }) {
    const message = game.messages.get(messageId);
    const actors = new Set(actorUuids.map(uuid => fromUuidSync(uuid)).filter(_ => _));

    const promises = [];
    const damages = message.rolls.map(roll => ({ type: roll.damageType, value: roll.total }));

    for (const actor of actors) {
      promises.push(async function() {
        const value = actor.system.health.value;
        await actor.applyDamage(damages);
        const delta = value - actor.system.health.value;
        return { actorUuid: actor.uuid, amount: delta };
      }());
    }

    const results = await Promise.all(promises);
    const damaged = foundry.utils.deepClone(message.system._source.damaged);
    for (const result of results) {
      const existing = damaged.find(d => d.actorUuid === result.actorUuid);
      if (existing) existing.amount = result.amount;
      else damaged.push(result);
    }
    await message.update({ "system.damaged": damaged });
    return true;
  }

  /* -------------------------------------------------- */

  /**
   * Query method for undoing damage via chat message.
   * @param {object} queryData
   * @param {string} queryData.messageId      The id of the chat message with targets.
   * @param {string[]} queryData.actorUuid    The uuid of the actor to which to undo damage.
   * @returns {Promise<boolean>}              A promise that resolves once damage has been undone and the message updated.
   */
  static async #undoDamageQuery({ messageId, actorUuid }) {
    const message = game.messages.get(messageId);
    const actor = fromUuidSync(actorUuid);
    const damaged = foundry.utils.deepClone(message.system._source.damaged);
    const amount = damaged.findSplice(d => d.actorUuid === actor.uuid).amount;
    await actor.applyHealing(amount);
    await message.update({ "system.damaged": damaged });
    return true;
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
      expanded: {
        rolls: DamageData.#expandedStates[this.parent.id]?.rolls ?? false,
        tokens: DamageData.#expandedStates[this.parent.id]?.tokens ?? true,
      },
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
          el.addEventListener("click", () => {
            foundry.utils.setProperty(
              DamageData.#expandedStates,
              `${this.parent.id}.rolls`,
              el.classList.toggle("expanded"),
            );
          });
          break;
        case "applyDamage":
          el.addEventListener("click", (event) => {
            foundry.utils.setProperty(DamageData.#expandedStates, `${this.parent.id}.tokens`, false);
            const results = DamageData.#applyDamage.call(this, event, el);
            this.#applyResults(results);
          });
          break;
        case "toggleTargetsExpanded":
          el.addEventListener("click", () => {
            foundry.utils.setProperty(
              DamageData.#expandedStates,
              `${this.parent.id}.tokens`,
              el.closest(".targeting").classList.toggle("expanded"),
            );
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
    const user = game.users.getDesignatedUser(user => this.parent.canUserModify(user, "update"));
    const config = { messageId: this.parent.id, actorUuids: [] };

    const parent = target.closest(".targeting.damage");
    for (const element of parent.querySelectorAll(".target-element.damage:not(.damaged)")) {
      const actor = fromUuidSync(element.dataset.actorUuid);
      if (!actor) continue;
      config.actorUuids.push(actor.uuid);
    }

    user.query("chatDamage", { type: "applyDamage", config });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    delete DamageData.#expandedStates[this.parent.id];
  }
}
