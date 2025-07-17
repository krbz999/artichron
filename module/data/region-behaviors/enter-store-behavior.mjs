const { ForeignDocumentField } = foundry.data.fields;

/**
 * Behavior type that renders the actor sheet of a merchant type actor.
 */
export default class EnterStoreBehaviorData extends foundry.data.regionBehaviors.RegionBehaviorType {
  /** @inheritdoc */
  static events = {
    [CONST.REGION_EVENTS.TOKEN_ANIMATE_IN]: EnterStoreBehaviorData.#onTokenEnter,
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["ARTICHRON.REGION.ENTERSTORE"];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      merchant: new ForeignDocumentField(foundry.documents.Actor, {
        required: true,
        blank: true,
        initial: "",
        choices: () => {
          return game.actors.reduce((acc, actor) => {
            if (actor.type === "merchant") acc[actor.id] = actor.name;
            return acc;
          }, {});
        },
      }),
    };
  }

  /* -------------------------------------------------- */

  /**
   * The script that is executed when a token enters the region.
   * @this {EnterStoreBehaviorData}
   * @param {RegionEvent} event   The region event data from triggering this behavior.
   */
  static async #onTokenEnter(event) {
    const isUser = (event.user === game.user) || (!game.user.isGM && event.data.token.isOwner);
    const actor = this.merchant;
    if (isUser && actor && (actor.type === "merchant")) {
      const { token } = event.data;
      const { passed, pending } = token.movement;
      const endpoint = passed.waypoints.at(-1);
      const isEndpoint = !pending.waypoints.length;
      const endpointIn = isEndpoint && event.region.testPoint(endpoint);
      if (!endpointIn) return;
      await token.object?.movementAnimationPromise;
      actor.sheet.render({ force: true });
    }
  }
}
