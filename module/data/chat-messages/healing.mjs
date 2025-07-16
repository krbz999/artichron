import ChatMessageSystemModel from "./system-model.mjs";

const { ArrayField, DocumentUUIDField, NumberField, SchemaField } = foundry.data.fields;

export default class HealingData extends ChatMessageSystemModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      healed: new ArrayField(new SchemaField({
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
      case "undoHealing": return HealingData.#undoHealingQuery(config);
      case "applyHealing": return HealingData.#applyHealingQuery(config);
    }
  };

  /* -------------------------------------------------- */

  /**
   * Query method for applying healing via chat message.
   * @param {object} queryData
   * @param {string} queryData.messageId      The id of the chat message with targets.
   * @param {string[]} queryData.actorUuids   The uuids of the actors to apply healing to.
   * @returns {Promise<boolean>}              A promise that resolves once healing has been applied and the message updated.
   */
  static async #applyHealingQuery({ messageId, actorUuids }) {
    const message = game.messages.get(messageId);
    const actors = new Set(actorUuids.map(uuid => fromUuidSync(uuid)).filter(_ => _));

    const promises = [];
    const healing = message.rolls.reduce((acc, roll) => acc + roll.total, 0);

    for (const actor of actors) {
      promises.push(async function() {
        const value = actor.system.health.value;
        await actor.system.applyHealing(healing);
        const delta = actor.system.health.value - value;
        return { actorUuid: actor.uuid, amount: delta };
      }());
    }

    const results = await Promise.all(promises);
    const healed = foundry.utils.deepClone(message.system._source.healed);
    for (const result of results) {
      const existing = healed.find(d => d.actorUuid === result.actorUuid);
      if (existing) existing.amount = result.amount;
      else healed.push(result);
    }
    await message.update({ "system.healed": healed });
    return true;
  }

  /* -------------------------------------------------- */

  /**
   * Query method for undoing healing via chat message.
   * @param {object} queryData
   * @param {string} queryData.messageId      The id of the chat message with targets.
   * @param {string[]} queryData.actorUuid    The uuid of the actor to which to undo healing.
   * @returns {Promise<boolean>}              A promise that resolves once healing has been undone and the message updated.
   */
  static async #undoHealingQuery({ messageId, actorUuid }) {
    const message = game.messages.get(messageId);
    const actor = fromUuidSync(actorUuid);
    const healed = foundry.utils.deepClone(message.system._source.healed);
    const amount = healed.findSplice(d => d.actorUuid === actor.uuid).amount;
    await actor.system.applyDamage(amount);
    await message.update({ "system.healed": healed });
    return true;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(context) {
    context.rolls = [];
    context.total = 0;
    context.expanded = {
      rolls: HealingData.#expandedStates[this.parent.id]?.rolls ?? false,
      tokens: HealingData.#expandedStates[this.parent.id]?.tokens ?? true,
    };

    for (const roll of this.parent.rolls) {
      context.total += roll.total;
      const { img, label, color } = artichron.config.HEALING;
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
        // multiplier: (roll.multiplier !== 1) ? roll.multiplier.toNearest(0.01) : null,
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
              HealingData.#expandedStates,
              `${this.parent.id}.rolls`,
              el.classList.toggle("expanded"),
            );
          });
          break;
        case "applyHealing":
          el.addEventListener("click", (event) => {
            foundry.utils.setProperty(HealingData.#expandedStates, `${this.parent.id}.tokens`, false);
            HealingData.#applyHealing.call(this.parent, event, el);
          });
          break;
        case "toggleTargetsExpanded":
          el.addEventListener("click", () => {
            foundry.utils.setProperty(
              HealingData.#expandedStates,
              `${this.parent.id}.tokens`,
              el.closest(".targeting").classList.toggle("expanded"),
            );
          });
          break;
      }
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _configureTokenElement(element, actor) {
    // Also show damage calculation.
    element.classList.add("healing");
    const healed = this.healed.some(d => d.actorUuid === actor.uuid);
    if (healed) {
      element.classList.add("healed");
      const undoButton = foundry.utils.parseHTML("<a class='undo fa-solid fa-fw fa-recycle'></a>");
      undoButton.addEventListener("click", event => HealingData.#undoHealing.call(this.parent, event, undoButton));
      element.insertAdjacentElement("beforeend", undoButton);
    } else {
      const delta = this.parent.rolls.reduce((acc, roll) => acc + roll.total, 0);
      const cssClass = [ "damage-delta", "healing" ].filterJoin(" ");
      element.insertAdjacentHTML("beforeend", `<span class="${cssClass}">${Math.abs(delta)}</span>`);
    }
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Apply healing to all the token actors.
   * @this {foundry.documents.ChatMessage}
   * @param {PointerEvent} event          The initiating click event.
   * @param {HTMLButtonElement} target    The button that defined the [data-action].
   * @returns {Promise<boolean>}          A promise that resolves once healing has been applied
   *                                      and the chat message updated.
   */
  static async #applyHealing(event, target) {
    const user = game.users.getDesignatedUser(user => user.active && this.canUserModify(user, "update"));

    if (!user) {
      throw new Error("NO USER FOUND"); // TODO: ui.notif
    }

    const config = { messageId: this.id, actorUuids: [] };

    const parent = target.closest(".targeting.healing");
    for (const element of parent.querySelectorAll(".target-element.healing:not(.healed)")) {
      const actor = fromUuidSync(element.dataset.actorUuid);
      if (!actor) continue;
      config.actorUuids.push(actor.uuid);
    }

    return user.query("chatHealing", { type: "applyHealing", config }, { timeout: 10_000 });
  }

  /* -------------------------------------------------- */

  /**
   * Handle undoing healing.
   * @this {foundry.documents.ChatMessage}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The target element.
   */
  static #undoHealing(event, target) {
    const actor = fromUuidSync(target.closest("[data-actor-uuid]").dataset.actorUuid);

    const user = game.users.getDesignatedUser(user => {
      return actor.canUserModify(user, "update") && this.canUserModify(user, "update");
    });

    const config = { messageId: this.id, actorUuid: actor.uuid };
    user.query("chatHealing", { type: "undoHealing", config }, { timeout: 10_000 });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    delete HealingData.#expandedStates[this.parent.id];
  }
}
