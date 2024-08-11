const {HTMLField, NumberField, StringField} = foundry.data.fields;

export default class ProgressPageData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      value: new NumberField({min: 0, step: 1}),
      max: new NumberField({min: 1, step: 1}),
      description: new HTMLField({required: true}),
      type: new StringField({
        required: true,
        initial: "clock",
        choices: {battery: "Battery", clock: "Clock"}
      })
    };
  }

  prepareDerivedData() {
    this.value = Math.min(this.value, this.max);
  }

  async toEmbed(config, options = {}) {
    const wrapper = document.createElement("SECTION");
    wrapper.classList.add("progress-page");

    let element;
    switch (this.type) {
      case "battery":
        element = artichron.elements.BatteryProgressElement.create({value: this.value, max: this.max, rgb: "0, 0, 255", disabled: true});
        break;
      case "clock":
        element = artichron.elements.ProgressClockElement.create({value: this.value, max: this.max});
        break;
    }
    wrapper.insertAdjacentElement("beforeend", element);

    const description = document.createElement("DIV");
    description.classList.add("description");
    description.innerHTML = await TextEditor.enrichHTML(this.description, {relativeTo: this.parent});
    wrapper.insertAdjacentElement("beforeend", description);

    return wrapper;
  }
}
