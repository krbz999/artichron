const { BooleanField, StringField } = foundry.data.fields;

/**
 * Behavior type that toggles a status condition.
 */
export default class ToggleConditionBehaviorData extends foundry.data.regionBehaviors.RegionBehaviorType {
  /** @type {import("../../_types").DocumentSubtypeMetadata} */
  static get metadata() {
    return {
      embedded: {},
      icon: "fa-solid fa-stroopwafel",
      type: "statusCondition",
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["ARTICHRON.REGION.TOGGLECONDITION"];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      events: this._createEventsField({ events: [
        CONST.REGION_EVENTS.TOKEN_ENTER,
        CONST.REGION_EVENTS.TOKEN_EXIT,
        CONST.REGION_EVENTS.TOKEN_ROUND_END,
        CONST.REGION_EVENTS.TOKEN_ROUND_START,
        CONST.REGION_EVENTS.TOKEN_TURN_END,
        CONST.REGION_EVENTS.TOKEN_TURN_START,
      ] }),
      status: new StringField({
        choices: () => CONFIG.statusEffects.reduce((acc, k) => {
          if (k.hud !== false) acc[k.id] = k.name;
          return acc;
        }, {}),
      }),
      decrease: new BooleanField(),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _handleRegionEvent(event) {
    if ((event.user !== game.user) || !this.status) return;
    await event.data.token.object?.movementAnimationPromise;
    event.data.token.actor.toggleStatusEffect(this.status, { active: !this.decrease });
  }
}
