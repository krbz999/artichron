const { NumberField, SchemaField, StringField } = foundry.data.fields;

export default class ActivityTargetField extends SchemaField {
  constructor(fields = {}, options = {}) {
    fields = {
      type: new StringField({ choices: () => artichron.config.TARGET_TYPES, initial: "single" }),
      count: new NumberField({ min: 1, integer: true, nullable: false, initial: 1 }),
      duration: new StringField({ choices: () => artichron.config.TEMPLATE_DURATIONS, initial: "combat" }),
      range: new NumberField({ min: 1, integer: true, nullable: false, initial: 1 }),
      size: new NumberField({ min: 1, integer: true, nullable: false, initial: 1 }),
      width: new NumberField({ min: 1, integer: true, nullable: false, initial: 1 }),
      ...fields,
    };
    super(fields, options);
  }
}
