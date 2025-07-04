import ArsenalData from "./item-arsenal.mjs";

const {
  NumberField, SchemaField,
} = foundry.data.fields;

export default class SpellData extends ArsenalData {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      embedded: {
        Activity: "system.activities",
      },
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      activities: new artichron.data.fields.CollectionField(artichron.data.pseudoDocuments.activities.BaseActivity),
      price: new SchemaField({
        value: new NumberField({ min: 0, initial: 0, integer: true, nullable: false }),
      }),
      weight: new SchemaField({
        value: new NumberField({ min: 0, step: 0.01, initial: 1, nullable: false }),
      }),
    });
  }
}
