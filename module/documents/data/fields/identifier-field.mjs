/**
 * Simple string field to determine a semi-unique identifier for an item.
 */
export default class IdentifierField extends foundry.data.fields.StringField {
  /** @override */
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {
      blank: false,
      required: true,
      nullable: true,
      initial: null,
    }, { inplace: false });
  }

  /* -------------------------------------------------- */

  /** @override */
  clean(value, options) {
    value = super.clean(value, options);
    if (!value) return value;
    return value.slugify({ strict: true });
  }
}
