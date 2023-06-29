import {ValueField} from "./value.mjs";

export const CostField = () => ({
  cost: new foundry.data.fields.SchemaField({
    value: new ValueField(),
    type: new foundry.data.field.StringField({choices: ["health", "stamina", "mana"]})
  })
});
