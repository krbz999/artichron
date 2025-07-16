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
   * Query method to delegate handling.
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
        await actor.system.applyDamage(damages);
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
    await actor.system.applyHealing(amount);
    await message.update({ "system.damaged": damaged });
    return true;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(context) {
    context.rolls = [];
    context.total = 0;
    context.expanded = {
      rolls: DamageData.#expandedStates[this.parent.id]?.rolls ?? false,
      tokens: DamageData.#expandedStates[this.parent.id]?.tokens ?? true,
    };

    for (const roll of this.parent.rolls) {
      context.total += roll.total;
      const { img, label, color } = artichron.config.DAMAGE_TYPES[roll.damageType];
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
        color, dice, img, label,
        total: roll.total,
        formula: roll.formula,
        multiplier: (roll.multiplier !== 1) ? roll.multiplier.toNearest(0.01) : null,
      });
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _applyEventListeners(element) {
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
            DamageData.#applyDamage.call(this.parent, event, el);
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
    return actor.system.calculateDamage(damages, { numeric: true });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _configureTokenElement(element, actor) {
    // Also show damage calculation.
    element.classList.add("damage");
    const damaged = this.damaged.some(d => d.actorUuid === actor.uuid);
    if (damaged) {
      element.classList.add("damaged");
      const undoButton = foundry.utils.parseHTML("<a class='undo fa-solid fa-fw fa-recycle'></a>");
      undoButton.addEventListener("click", event => DamageData.#undoDamage.call(this.parent, event, undoButton));
      element.insertAdjacentElement("beforeend", undoButton);
    } else {
      const delta = -this.calculateDamage(actor);
      const cssClass = [
        "damage-delta",
        (delta < 0) ? "damage" : (delta > 0) ? "healing" : "",
      ].filterJoin(" ");
      element.insertAdjacentHTML("beforeend", `<span class="${cssClass}">${Math.abs(delta)}</span>`);
    }
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Apply damage to all the token actors.
   * @this {foundry.documents.ChatMessage}
   * @param {PointerEvent} event          The initiating click event.
   * @param {HTMLButtonElement} target    The button that defined the [data-action].
   * @returns {Promise<boolean>}          A promise that resolves once damage has been applied
   *                                      and the chat message updated.
   */
  static async #applyDamage(event, target) {
    const config = { messageId: this.id, actorUuids: [] };

    const parent = target.closest(".targeting.damage");
    const actors = new Set();
    for (const element of parent.querySelectorAll(".target-element.damage:not(.damaged)")) {
      const actor = fromUuidSync(element.dataset.actorUuid);
      if (!actor) continue;
      actors.add(actor);
      config.actorUuids.push(actor.uuid);
    }

    const user = game.users.getDesignatedUser(user => {
      if (!user.active || !this.canUserModify(user, "update")) return false;
      return actors.every(actor => actor.canUserModify(user, "update"));
    });

    if (!user) {
      return void ui.notifications.warn("ARTICHRON.CHAT.noActiveUser", { localize: true });
    }

    return user.query("chatDamage", { type: "applyDamage", config }, { timeout: 10_000 });
  }

  /* -------------------------------------------------- */

  /**
   * Handle undoing damage.
   * @this {foundry.documents.ChatMessage}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The target element.
   */
  static #undoDamage(event, target) {
    const actor = fromUuidSync(target.closest("[data-actor-uuid]").dataset.actorUuid);

    const user = game.users.getDesignatedUser(user => {
      return actor.canUserModify(user, "update") && this.canUserModify(user, "update");
    });

    const config = { messageId: this.id, actorUuid: actor.uuid };
    user.query("chatDamage", { type: "undoDamage", config }, { timeout: 10_000 });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    delete DamageData.#expandedStates[this.parent.id];
  }
}
