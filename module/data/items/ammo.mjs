import ItemSystemModel from "./system-model.mjs";

const { NumberField, SchemaField, StringField } = foundry.data.fields;

export default class AmmoData extends ItemSystemModel {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      sections: {
        inventory: true,
      },
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      price: new SchemaField({
        value: new NumberField({ min: 0, initial: 0, integer: true, nullable: false }),
      }),
      quantity: new SchemaField({
        value: new NumberField({ initial: 1, min: 0, integer: true, nullable: false }),
      }),
      weight: new SchemaField({
        value: new NumberField({ min: 0, step: 0.01, initial: 0.1, nullable: false }),
      }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ITEM.AMMO",
  ];
}
