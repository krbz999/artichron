const {ForeignDocumentField} = foundry.data.fields;

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
    type: "enterStore"
  });

  /* -------------------------------------------------- */

  /** @override */
  static events = {
    [CONST.REGION_EVENTS.TOKEN_ENTER]: EnterStoreBehaviorData.#onTokenEnter
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
          // This is not functional due to a bug in core.
          return game.actors.reduce((acc, actor) => {
            if (actor.type === "merchant") acc[actor.id] = actor.name;
            return acc;
          }, {});
        }
      })
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
    if (isUser && actor) {
      await CanvasAnimation.getAnimation(`Token.${event.data.token.id}.animate`)?.promise;
      actor.sheet.render({force: true});
    }
  }
}
