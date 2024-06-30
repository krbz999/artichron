export class IdField extends foundry.data.fields.DocumentIdField {
  /** @inheritdoc */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      nullable: false,
      initial: () => foundry.utils.randomID(),
      validationError: "is not a valid ID string"
    });
  }

  /* -------------------------------------------------- */

  /** @override */
  _cast(value) {
    return String(value);
  }
}
