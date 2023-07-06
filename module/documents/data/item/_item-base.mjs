import {ValueField} from "../fields/value.mjs";

export class BaseItemModel extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    return {
      description: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.HTMLField({label: "ARTICHRON.DescriptionValue"})
      }),
      traits: this._defineTraits()
    };
  }

  static _defineTraits(){
    return {
      weight: new foundry.data.fields.SchemaField({
        value: new ValueField({label: "ARTICHRON.WeightValue"})
      }),
      price: new foundry.data.fields.SchemaField({
        value: new ValueField({label: "ARTICHRON.PriceValue"})
      })
    };
  }
}
