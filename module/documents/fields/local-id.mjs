/** A field to reference a document within this model. */
export class LocalIdField extends foundry.data.fields.DocumentIdField {
  /** @override */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {readonly: false});
  }

  /** @override */
  toObject(value) {
    return value?._id ?? value;
  }
}
