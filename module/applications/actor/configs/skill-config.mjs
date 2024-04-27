import BaseConfig from "./base-config.mjs";

export default class SkillConfig extends BaseConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    actions: {
      onChangeSelect: SkillConfig.#onChangeSelect
    }
  };

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
      fields: artichron.dataModels.actor.hero.schema.fields.skills.fields,
      source: skills,
      disabled: new Set(Object.values(skills).map(k => k.faces)).size !== 3
    };
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
