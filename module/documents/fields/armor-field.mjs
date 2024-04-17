const {NumberField} = foundry.data.fields;

export class ArmorField extends foundry.data.fields.SchemaField {
  constructor(schemaOptions = {}) {
    const fields = {
      value: new NumberField({integer: true, min: 0, initial: null})
    };
    super(fields, schemaOptions);
  }
}
