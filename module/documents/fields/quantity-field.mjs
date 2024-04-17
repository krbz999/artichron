const {NumberField} = foundry.data.fields;

export class QuantityField extends foundry.data.fields.SchemaField {
  constructor(schemaOptions = {}) {
    const fields = {
      value: new NumberField({integer: true, min: 0, initial: 1})
    };
    super(fields, schemaOptions);
  }
}
