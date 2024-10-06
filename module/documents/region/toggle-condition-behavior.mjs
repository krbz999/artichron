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
  static LOCALIZATION_PREFIXES = ["ARTICHRON.REGION.TOGGLECONDITION"];

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      events: this._createEventsField({events: [
        CONST.REGION_EVENTS.TOKEN_ENTER,
        CONST.REGION_EVENTS.TOKEN_EXIT,
        CONST.REGION_EVENTS.TOKEN_ROUND_END,
        CONST.REGION_EVENTS.TOKEN_ROUND_START,
        CONST.REGION_EVENTS.TOKEN_TURN_END,
        CONST.REGION_EVENTS.TOKEN_TURN_START
      ]}),
      status: new StringField({
        choices: () => CONFIG.statusEffects.reduce((acc, k) => {
          if (k.hud !== false) acc[k.id] = k.name;
          return acc;
        }, {})
      }),
      decrease: new BooleanField()
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _handleRegionEvent(event) {
    if ((event.user !== game.user) || !this.status) return;
    await CanvasAnimation.getAnimation(`Token.${event.data.token.id}.animate`)?.promise;
    if (!this.decrease) event.data.token.actor?.applyCondition(this.status);
    else event.data.token.actor?.unapplyCondition(this.status);
  }
}
