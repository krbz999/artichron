const {NumberField, SetField, StringField} = foundry.data.fields;

/**
 * Behavior type that toggles a door state.
 */
export default class ToggleDoorBehaviorData extends foundry.data.regionBehaviors.RegionBehaviorType {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").SystemModelMetadata}
   */
  static metadata = Object.freeze({
    icon: "fa-solid fa-door-open",
    type: "doorState"
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
      doors: new SetField(new StringField()),
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
    const updates = [];
    for (const uuid of this.doors) {
      const wall = fromUuidSync(uuid);
      if (!wall || (wall.door === CONST.WALL_DOOR_TYPES.NONE)) continue;
      updates.push({_id: wall.id, ds: this.state});
    }
    this.scene.updateEmbeddedDocuments("Wall", updates);
  }
}
