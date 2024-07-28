const {NumberField} = foundry.data.fields;

export default class ProgressPageData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      value: new NumberField({min: 0, step: 1}),
      max: new NumberField({min: 1, step: 1})
    };
  }

  prepareDerivedData() {
    this.value = Math.min(this.value, this.max);
  }

  async toEmbed(config, options = {}) {
    const element = artichron.elements.ProgressClockElement.create(this);
    return element;
  }
}
