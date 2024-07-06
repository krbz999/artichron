import {FormulaField} from "./formula-field.mjs";

const {SchemaField} = foundry.data.fields;

export class ResistanceField extends SchemaField {
  constructor(schemaOptions = {}) {
    const fields = {};
    for (const [k, v] of Object.entries(CONFIG.SYSTEM.DAMAGE_TYPES)) {
      if (v.resist) fields[k] = new SchemaField({
        value: new FormulaField({
          required: true,
          label: `ARTICHRON.DamageType.${k.capitalize()}Res`
        })
      });
    }
    super(fields, schemaOptions);
  }
}
