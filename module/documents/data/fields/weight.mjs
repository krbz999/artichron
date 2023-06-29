import {ValueField} from "./value.mjs";

export const WeightField = () => ({
  weight: new foundry.data.fields.SchemaField({
    value: new ValueField()
  })
});
