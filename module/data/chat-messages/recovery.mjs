import ChatMessageSystemModel from "./system-model.mjs";

export default class RecoveryData extends ChatMessageSystemModel {
  /** @inheritdoc */
  static defineSchema() {
    return {};
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _applyEventListeners(element) {
    const button = element.querySelector("[data-action=participateRecovery]");
    button.addEventListener("click", RecoveryData.#participateRecovery.bind(this.parent));
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
    party.system.finalizeRecovery();
  }
}
