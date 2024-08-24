const {NumberField, StringField} = foundry.data.fields;

/**
 * @typedef {object} RegionBehaviorMetadata
 * @property {string} icon      Type icon for this region behavior.
 */

/**
 * Behavior type that configures a trap that prompts a saving throw and deals damage.
 */
export default class ToggleDoorBehaviorData extends foundry.data.regionBehaviors.RegionBehaviorType {
  /**
   * Metadata for this behavior type.
   * @type {RegionBehaviorMetadata}
   */
  static metadata = Object.freeze({
    icon: "fa-solid fa-door-open"
  });

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["ARTICHRON.RegionProperty.TOGGLEDOOR"];

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      events: this._createEventsField({events: [
        CONST.REGION_EVENTS.TOKEN_ENTER,
        CONST.REGION_EVENTS.TOKEN_EXIT
      ]}),
      door: new StringField({type: "Wall", embedded: true}),
      state: new NumberField({
        initial: CONST.WALL_DOOR_STATES.OPEN,
        choices: () => {
          const choices = {};
          for (const [k, v] of Object.entries(CONST.WALL_DOOR_STATES)) {
            choices[v] = `WALLS.DoorStates.${k}`;
          }
          return choices;
        }
      })
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  async _handleRegionEvent(event) {
    if (!game.users.activeGM?.isSelf) return;
    const door = fromUuidSync(this.door);
    if (!door || (door.door === CONST.WALL_DOOR_TYPES.NONE)) return;
    door.update({ds: this.state});
  }
}
