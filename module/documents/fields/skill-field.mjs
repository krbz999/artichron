const {NumberField, SchemaField} = foundry.data.fields;

export class SkillField extends SchemaField {
  constructor(skill, options = {}) {
    const configuration = CONFIG.SYSTEM.SKILLS[skill];
    const fields = {
      value: new NumberField({
        integer: true,
        min: 0,
        initial: 0,
        label: configuration.label
      })
    };
    super(fields, options);
  }
}
