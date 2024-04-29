import {SYSTEM} from "../../helpers/config.mjs";
import {ResistanceBonusField} from "./resistance-bonus-field.mjs";

const {SchemaField} = foundry.data.fields;

// For items.
export class ResistanceField extends SchemaField {
  constructor(schemaOptions = {}) {
    const fields = {};
    for (const [k, v] of Object.entries(SYSTEM.DAMAGE_TYPES)) {
      if (v.resist) fields[k] = new SchemaField({
        value: new ResistanceBonusField({required: true})
      });
    }
    super(fields, schemaOptions);
  }
}
