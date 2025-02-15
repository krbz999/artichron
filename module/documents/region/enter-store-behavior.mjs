const { ForeignDocumentField } = foundry.data.fields;

/**
 * Behavior type that renders the actor sheet of a merchant type actor.
 */
export default class EnterStoreBehaviorData extends foundry.data.regionBehaviors.RegionBehaviorType {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").SystemModelMetadata}
   */
  static metadata = Object.freeze({
    icon: "fa-solid fa-store",
    type: "enterStore",
  });

  /* -------------------------------------------------- */

  /** @override */
  static events = {
    [CONST.REGION_EVENTS.TOKEN_ENTER]: EnterStoreBehaviorData.#onTokenEnter,
  };

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["ARTICHRON.REGION.ENTERSTORE"];

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      merchant: new ForeignDocumentField(Actor, {
        required: true,
        blank: true,
        initial: "",
        choices: () => {
          // Nonfunctional until v13.
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
   * @param {RegionEvent} event     The region event data from triggering this behavior.
   */
  static async #onTokenEnter(event) {
    const isUser = (event.user === game.user) || (!game.user.isGM && event.data.token.isOwner);
    const actor = this.merchant;
    if (isUser && actor && (actor.type === "merchant")) {
      await CanvasAnimation.getAnimation(event.data.token.object?.animationName)?.promise;
      actor.sheet.render({ force: true }).then(() => foundry.audio.AudioHelper.play({
        src: "systems/artichron/assets/sounds/shop-bell.wav",
        channel: "interface",
      }));
    }
  }
}
