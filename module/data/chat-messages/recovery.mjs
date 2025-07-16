import ChatMessageSystemModel from "./system-model.mjs";

export default class RecoveryData extends ChatMessageSystemModel {
  /** @inheritdoc */
  static defineSchema() {
    return {};
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(context) {
    const ctx = context.ctx = { tasks: [] };
    const results = this.parent.getFlag("artichron", "recovery.results") ?? {};
    for (const [taskId, k] of Object.entries(results)) {

      // Any members not yet rolled?
      const incomplete = context.actor.system.members.some(member => {
        const actor = member.actor;
        return (actor.type === "hero")
          && context.actor.system.recovery.tasks[taskId].assigned.has(actor.id) && !(actor.id in k.rolled);
      });
      ctx.tasks.push({
        ...k,
        complete: !incomplete,
        result: Object.values(k.rolled).reduce((acc, r) => acc + r, 0),
      });
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _applyEventListeners(element) {
    element.querySelector("[data-action=participateRecovery]")
      .addEventListener("click", RecoveryData.#participateRecovery.bind(this.parent));

    element.querySelector("[data-action=requestRolls]")
      ?.addEventListener("click", RecoveryData.#requestRolls.bind(this.parent));
  }

  /* -------------------------------------------------- */

  /**
   * Render recovery phase.
   * @this {foundry.documents.ChatMessage}
   * @param {PointerEvent} event    Initiating click event.
   */
  static #participateRecovery(event) {
    const party = this.speakerActor;
    if (!party.getFlag("artichron", "recovering")) {
      ui.notifications.warn("ARTICHRON.RECOVERY.noRecoveryPhaseInProgress", { localize: true });
      return;
    }
    party.system.finalizeRecovery({ chatMessage: this });
  }

  /* -------------------------------------------------- */

  /**
   * Request skill checks for tasks that have not been performed.
   * @this {foundry.documents.ChatMessage}
   * @param {PointerEvent} event    Initiating click event.
   */
  static async #requestRolls(event) {
    const party = this.speakerActor;
    const results = this.getFlag("artichron", "recovery.results");

    const promises = {};

    for (const k in results) {
      const data = results[k];
      const assigned = Array.from(party.system.recovery.tasks[k].assigned)
        .map(id => party.system.members.get(id)?.actor)
        .filter(actor => (actor?.type === "hero") && !(actor.id in data.rolled));
      for (const actor of assigned) {
        const user = game.users.getDesignatedUser(user =>
          user.active && !user.isGM && actor.testUserPermission(user, "OWNER"),
        ) ?? game.user;

        promises[`flags.artichron.recovery.results.${k}.rolled.${actor.id}`] = user.query("hero", {
          type: "rollSkill", config: {
            heroId: actor.id,
            base: party.system.recovery.tasks[k].skills.primary,
            second: party.system.recovery.tasks[k].skills.secondary,
          },
        });
      }
    }

    const notif = ui.notifications.info("ARTICHRON.RECOVERY.CHAT.requestingRolls", { localize: true, progress: true });
    const length = Object.keys(promises).length;
    let i = 1;
    for (const k in promises) {
      const result = await promises[k];
      if (result === null) delete promises[k];
      else promises[k] = result;
      notif.update({ pct: (i++) / length });
    }

    await this.update(promises);
  }
}
