export default class SkillConfig extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.DocumentSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: super.DEFAULT_OPTIONS.classes.concat("artichron"),
    sheetConfig: false,
    position: {
      width: 300,
      height: "auto"
    },
    actions: {
      onChangeSelect: SkillConfig.#onChangeSelect
    },
    form: {
      handler: SkillConfig.#onSubmitDocumentForm,
      closeOnSubmit: true
    }
  };

  static async #onSubmitDocumentForm(event, form, formData) {
    const submitData = this._prepareSubmitData(event, form, formData);
    await this.document.update(submitData);
  }

  /** @override */
  static PARTS = {
    form: {
      id: "form",
      template: "systems/artichron/templates/actor/config/skills.hbs"
    }
  };

  /** @override */
  get title() {
    return game.i18n.format("ARTICHRON.Skills.Config", {name: this.document.name});
  }

  /** @override */
  async _prepareContext(options) {
    const skills = this.document.system.toObject().skills;
    const data = {
      config: CONFIG.SYSTEM,
      choices: {4: "d4", 8: "d8", 12: "d12"},
      skills: Object.entries(skills).map(([key, skill]) => ({
        key: key,
        selected: skill.faces,
        label: `ARTICHRON.Skills.${key.capitalize()}`
      })),
      fields: artichron.dataModels.actor.hero.schema.fields.skills.fields,
      source: this.document.toObject()
    };
    data.disabled = new Set(data.skills.map(p => p.selected)).size !== 3;
    return data;
  }

  /** @override */
  _prepareSubmitData(event, form, formData) {
    const data = formData.object;
    Object.keys(data).forEach(k => {
      if (k.endsWith(".faces")) data[k] ||= 4;
    });
    return data;
  }

  /** @override */
  static #onChangeSelect(event) {
    const inputs = event.currentTarget.querySelectorAll("select");
    const disabled = Array.from(inputs).reduce((acc, k) => {
      const n = parseInt(k.value) || 4;
      acc.add(n);
      return acc;
    }, new Set()).size !== 3;
    event.currentTarget.querySelector("[type=submit]").disabled = disabled;
  }
}
