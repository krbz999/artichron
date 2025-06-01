import ItemSystemModel from "./system-model.mjs";

const {
  NumberField, SchemaField,
} = foundry.data.fields;

export default class TalentData extends ItemSystemModel {
  /** @inheritdoc */
  static get metadata() {
    // TODO: clean this mess up. The ItemSystemModel makes too many assumptions about all items being physical.
    return {
      embedded: {
        Advancement: "system.advancements",
      },
      fusion: false,
      icon: "",
      inventorySection: "",
      order: 0,
      type: "talent",
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      advancements: new artichron.data.fields.CollectionField(artichron.data.pseudoDocuments.advancements.BaseAdvancement),
    });
  }
}
