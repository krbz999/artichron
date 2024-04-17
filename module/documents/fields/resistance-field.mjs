import {SYSTEM} from "../../helpers/config.mjs";

const {NumberField, SchemaField} = foundry.data.fields;

// For items.
export class ResistanceField extends foundry.data.fields.SchemaField {
  constructor(schemaOptions = {}) {
    const fields = {};
    for (const [k, v] of Object.entries(SYSTEM.DAMAGE_TYPES)) {
      if (v.resist) fields[k] = new SchemaField({
        value: new NumberField({integer: true, min: 0, initial: null})
      });
    }
    super(fields, schemaOptions);
  }
}
