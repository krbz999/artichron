const {
  ArrayField,
  NumberField,
  SchemaField,
  StringField,
} = foundry.data.fields;

export default class HeroicPathModel extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    // TODO: this should have an array of stored data denoting how many points were
    // spent, what was unlocked, and link(?) to a granted item, and to what path it belongs.
    return {
      points: new SchemaField({
        value: new NumberField({ nullable: false, integer: true, min: 0, initial: 0 }),
      }),
      configured: new ArrayField(new SchemaField({
        path: new StringField({ // which of the 4 paths it was allocated in
          required: true,
          choices: CONFIG.SYSTEM.PROGRESSION_CORE_PATHS,
        }),
        item: new StringField(), // the uuid of the item that was awarded from this (if any)
        award: new StringField(), // unique id of an unlocked property, feature, whichever (if any)
      })),
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    "ARTICHRON.PROGRESSION.PATH",
  ];
}
