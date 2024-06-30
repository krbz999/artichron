import BaseConfig from "./base-config.mjs";

export default class SkillConfig extends BaseConfig {
  /** @override */
  static PARTS = {
    form: {
      id: "form",
      template: "systems/artichron/templates/actor/config/skills.hbs"
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.format("ARTICHRON.Skills.Config", {name: this.document.name});
  }

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const skills = this.document.system.toObject().skills;
    const data = {
      fields: artichron.dataModels.actor.hero.schema.fields.skills.fields,
      source: skills,
      disabled: new Set(Object.values(skills).map(k => k.faces)).size !== 3,
      dataset: {action: "onChange"}
    };
    return data;
  }

  /* -------------------------------------------------- */

  /** @override */
  _prepareSubmitData(event, form, formData) {
    const data = formData.object;
    Object.keys(data).forEach(k => {
      if (k.endsWith(".faces")) data[k] ||= 4;
    });
    return data;
  }

  /* -------------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelectorAll("[data-action=onChange]").forEach(n => {
      n.addEventListener("change", this._onChangeSelect.bind(this));
    });
  }

  /* -------------------------------------------------- */

  /**
   * Set the disabled state when a select element is changed.
   * @param {Event} event     The change event.
   */
  _onChangeSelect(event) {
    const inputs = this.element.querySelectorAll("[data-action=onChange]");
    const disabled = Array.from(inputs).reduce((acc, k) => {
      const n = parseInt(k.value) || 4;
      acc.add(n);
      return acc;
    }, new Set()).size !== 3;
    this.element.querySelector("[type=submit]").disabled = disabled;
  }
}
