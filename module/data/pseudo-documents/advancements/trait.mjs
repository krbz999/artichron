import BaseAdvancement from "./base-advancement.mjs";

const { NumberField, SchemaField, TypedObjectField } = foundry.data.fields;

export default class TraitAdvancement extends BaseAdvancement {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      requirements: new SchemaField({
        points: new NumberField({ integer: true, min: 1, nullable: false, initial: 1 }),
      }),
      traits: new TypedObjectField(new NumberField()), // TODO: JUST TEST DATA
      // If `null`, then this is explicitly a "receive all" - but also if the number is equal to or greater than the pool
      chooseN: new NumberField({ integer: true, nullable: true, initial: null, min: 1 }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "trait";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ADVANCEMENT.TRAIT",
  ];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get levels() {
    return [this.requirements.points];
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static async configureNode(node) {
    // TODO: This is just a test.
    const options = Object.entries(node.advancement.traits).map(([k, v]) => ({
      value: k,
      label: v,
      selected: node.selected[k] === true,
    }));
    const input = foundry.applications.fields.createMultiSelectInput({
      options,
      name: "myNumber",
    });
    const result = await artichron.applications.api.Dialog.input({
      content: input.outerHTML,
    });
    if (!result) return false;
    for (const { value: k } of options) node.selected[k] = result.myNumber.includes(k);
    console.warn(node);
    return true;
  }
}
