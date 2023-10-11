export class IdentifierField extends foundry.data.fields.StringField {
  /** @override */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {required: true});
  }

  /** @override */
  _cast(value) {
    return super._cast(value)
      .toLowerCase()
      .replaceAll(new RegExp(/[^a-z-]/g), "")
      .replaceAll(/[-]+/g, "-")
      .replaceAll(/[-]$/g, "")
      .replaceAll(/^[-]/g, "");
  }
}
