export class IdentifierField extends foundry.data.fields.StringField {
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {required: true});
  }

  _cast(value) {
    return super._cast(value)
      .toLowerCase()
      .replaceAll(new RegExp(/[^a-z-]/g), "")
      .replaceAll(/[-]+/g, "-")
      .replaceAll(/[-]$/g, "")
      .replaceAll(/^[-]/g, "");
  }
}
