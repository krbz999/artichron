// A small extension of NumberField to provide some defaults for properties that work as 'current value'.
export class ValueField extends foundry.data.fields.NumberField {
  static get _defaults() {
    return foundry.utils.mergeObject(super._defaults, {integer: true, min: 0});
  }
}
