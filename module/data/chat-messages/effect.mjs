import ChatMessageSystemModel from "./system-model.mjs";

const { DocumentUUIDField } = foundry.data.fields;

export default class EffectData extends ChatMessageSystemModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      activity: new DocumentUUIDField({ type: "Activity", embedded: true }),
    };
  }

  /* -------------------------------------------------- */

  /**
   * Static map to help store expanded states across re-renders.
   * @type {Record<string, boolean>}
   */
  static #expandedStates = {};

  /* -------------------------------------------------- */

  /**
   * Query method to delegate handling.
   * @type {Function}
   */
  static _query = ({ type, config }) => {
    switch (type) {
      case "applyEffects": return EffectData.#applyEffectsQuery(config);
    }
  };

  /* -------------------------------------------------- */

  /**
   * Query method for applying effects via chat message.
   * @param {object} queryData
   * @param {string} queryData.messageId      The id of the chat message with targets.
   * @param {string[]} queryData.actorUuids   The uuids of the actors to apply effects to.
   * @returns {Promise<boolean>}              A promise that resolves once effects have been applied.
   */
  static async #applyEffectsQuery({ messageId, actorUuids }) {
    const message = game.messages.get(messageId);
    const actors = new Set(actorUuids.map(uuid => fromUuidSync(uuid)).filter(_ => _));
    const activity = fromUuidSync(message.system.activity);

    const effectData = activity.document.effects.documentsByType.buff
      .filter(effect => !effect.transfer && activity.effects.ids.has(effect.id))
      .map(effect => {
        const data = effect.toObject();
        foundry.utils.mergeObject(data, {
          origin: effect.uuid,
          "system.granted": true,
        });
        return data;
      });

    for (const actor of actors) {
      const Cls = foundry.utils.getDocumentClass("ActiveEffect");
      if (effectData.length) await Cls.createDocuments(
        foundry.utils.deepClone(effectData), { parent: actor },
      );

      for (const status in activity.effects.statuses) {
        const config = artichron.config.STATUS_CONDITIONS[status];
        const id = artichron.utils.staticId(status);
        const existing = actor.effects.get(id);
        const { levels, rounds } = activity.effects.statuses[status];
        const leveled = existing ? existing.system.hasLevels : "levels" in config;

        if (existing && leveled) await existing.system.increase(levels);
        else if (existing) await existing.system.extendDuration(rounds);
        else await actor.toggleStatusEffect(status, { active: true, levels, rounds });
      }
    }

    return true;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(context) {
    context.expanded = {
      tokens: EffectData[this.parent.id] !== false,
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _applyEventListeners(/** @type {HTMLElement} */ element) {
    for (const el of element.querySelectorAll(".message-content [data-action]")) {
      switch (el.dataset.action) {
        case "applyEffects":
          el.addEventListener("click", event => {
            EffectData.#expandedStates[this.parent.id] = false;
            el.closest(".targeting.effect").classList.remove("expanded");
            EffectData.#applyEffects.call(this, event, el);
          });
          break;
        case "toggleTargetsExpanded":
          el.addEventListener("click", () => {
            EffectData.#expandedStates[this.parent.id] = el.closest(".targeting").classList.toggle("expanded");
          });
          break;
      }
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _configureTokenElement(element, actor) {
    const box = foundry.utils.parseHTML("<input type=\"checkbox\" checked>");
    box.addEventListener("change", () => element.classList.toggle("unchecked", !box.checked));
    element.insertAdjacentElement("beforeend", box);
    element.classList.add("effect");
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    delete EffectData.#expandedStates[this.parent.id];
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Apply applicable effects to tokens' actors.
   * @this {EffectData}
   * @param {PointerEvent} event          The initiating click event.
   * @param {HTMLButtonElement} target    The button that defined the [data-action].
   */
  static async #applyEffects(event, target) {
    let actors = Array.from(target.closest(".token-application").querySelectorAll(".target-element.effect:not(.unchecked)"))
      .map(element => fromUuidSync(element.dataset.actorUuid))
      .filter(_ => _);
    actors = new Set(actors);
    const user = game.users.getDesignatedUser(user => {
      return user.active
        && (user.isActiveGM ||
        (this.parent.canUserModify(user, "update") && actors.every(actor => actor.testUserPermission(user, "OWNER"))));
    });

    if (!user) {
      throw new Error("NO USER FOUND"); // TODO: ui.notif
    }

    const config = { messageId: this.parent.id, actorUuids: Array.from(actors).map(actor => actor.uuid) };
    return user.query("chatEffects", { type: "applyEffects", config });
  }
}
