const {BooleanField, StringField} = foundry.data.fields;

/**
 * Behavior type that toggles a status condition.
 */
export default class ToggleConditionBehaviorData extends foundry.data.regionBehaviors.RegionBehaviorType {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").SystemModelMetadata}
   */
  static metadata = Object.freeze({
    icon: "fa-solid fa-stroopwafel",
    type: "statusCondition"
  });

  /* -------------------------------------------------- */

  /** @override */
  static events = {
    [CONST.REGION_EVENTS.TOKEN_ENTER]: ToggleConditionBehaviorData.#addCondition,
    [CONST.REGION_EVENTS.TOKEN_EXIT]: ToggleConditionBehaviorData.#removeCondition,
    [CONST.REGION_EVENTS.TOKEN_ROUND_START]: ToggleConditionBehaviorData.#addCondition,
    [CONST.REGION_EVENTS.TOKEN_TURN_START]: ToggleConditionBehaviorData.#addCondition
  };

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["ARTICHRON.RegionProperty.TOGGLECONDITION"];

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      status: new StringField({
        choices: () => CONFIG.statusEffects.reduce((acc, k) => {
          if (k.hud !== false) acc[k.id] = k.name;
          return acc;
        }, {})
      }),
      autoremove: new BooleanField({initial: true})
    };
  }

  /* -------------------------------------------------- */

  /**
   * The script that is executed when a token enters the region or starts a turn or round in it.
   * @this {ToggleConditionBehaviorData}
   * @param {RegionEvent} event     The region event data from triggering this behavior.
   */
  static async #addCondition(event) {
    if (event.user !== game.user) return;
    await CanvasAnimation.getAnimation(`Token.${event.data.token.id}.animate`)?.promise;
    event.data.token.actor?.applyCondition(this.status);
  }

  /* -------------------------------------------------- */

  /**
   * The script that is executed when a token leaves the region.
   * @this {ToggleConditionBehaviorData}
   * @param {RegionEvent} event     The region event data from triggering this behavior.
   */
  static async #removeCondition(event) {
    if (!this.autoremove || (event.user !== game.user)) return;
    await CanvasAnimation.getAnimation(`Token.${event.data.token.id}.animate`)?.promise;
    event.data.token.actor?.unapplyCondition(this.status);
  }
}
