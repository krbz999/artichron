export class ItemSystemModel extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      description: new fields.SchemaField({
        value: new fields.HTMLField({label: "ARTICHRON.DescriptionValue", required: true})
      }),
      weight: new fields.SchemaField({
        value: new fields.NumberField({integer: true, min: 0, initial: 1})
      }),
      price: new fields.SchemaField({
        value: new fields.NumberField({integer: true, initial: null})
      }),
      type: new fields.SchemaField({
        category: new fields.StringField({required: true}),
        subtype: new fields.StringField({required: true})
      }),
      fusion: new fields.ArrayField(new fields.SchemaField({
        key: new fields.StringField({required: true}),
        value: new fields.StringField({required: true}),
        mode: new fields.NumberField({choices: Object.values(ItemSystemModel.FUSION_MODES)})
      }))
    };
  }

  async use() {
    throw new Error("Subclasses of the Item System Data Model must override the #use method.");
  }

  /**
   * Properties that can be amplified by a fused item.
   * @type {Set<string>}
   */
  static get BONUS_FIELDS() {
    return new Set([
      "price.value",
      "weight.value"
    ]);
  }

  /**
   * The ways in which a fusion can modify the item.
   * @enum {number}
   */
  static FUSION_MODES = {
    ADD: 1,
    UPGRADE: 2,
    DOWNGRADE: 3,
    OVERRIDE: 4
  };

  /** @override */
  prepareDerivedData() {
    this._prepareFusions();
  }

  /**
   * Apply inplace modifications to values of the item depending on its fusions.
   */
  _prepareFusions() {
    const fields = this.constructor.BONUS_FIELDS;

    for (const {key, value, mode} of this.fusion) {
      if (!fields.has(key)) continue;
      const v = artichron.utils.simplifyFormula(value, {});
      const vc = foundry.utils.getProperty(this, key);

      switch (mode) {
      case 1:
        foundry.utils.setProperty(this, key, vc + v);
        break;
      case 2:
        foundry.utils.setProperty(this, key, Math.max(v, vc));
        break;
      case 3:
        foundry.utils.setProperty(this, key, Math.min(v, vc));
        break;
      case 4:
        foundry.utils.setProperty(this, key, v);
        break;
      default:
        break;
      }
    }
  }
}
