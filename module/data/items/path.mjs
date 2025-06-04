import ItemSystemModel from "./system-model.mjs";

const {
  NumberField, SchemaField,
} = foundry.data.fields;

export default class PathData extends ItemSystemModel {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      embedded: {
        Advancement: "system.advancements",
      },
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      advancements: new artichron.data.fields.CollectionField(artichron.data.pseudoDocuments.advancements.BaseAdvancement),
      points: new SchemaField({
        invested: new NumberField({ integer: true, min: 0 }),
      }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ITEM.PATH",
  ];
}
