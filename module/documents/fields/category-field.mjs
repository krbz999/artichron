const {SchemaField, StringField} = foundry.data.fields;

export class CategoryField extends SchemaField {
  constructor({label, choices}, options) {
    const fields = {
      subtype: new StringField({required: true, label: label, choices: choices, blank: true})
    };
    super(fields, options);
  }
}
