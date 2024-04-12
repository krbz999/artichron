import BaseConfig from "./base-config.mjs";

export default class SkillConfig extends BaseConfig {
  /** @override */
  static get defaultOptions() {
    const options = super.defaultOptions;
    return options;
  }

  /** @override */
  get template() {
    return "systems/artichron/templates/actor/config/skills.hbs";
  }

  /** @override */
  get title() {
    return game.i18n.format("ARTICHRON.Skills.Config", {name: this.actor.name});
  }

  /** @override */
  get id() {
    return `config-skills-${this.actor.uuid.replaceAll(".", "-")}`;
  }

  /** @override */
  getData() {
    const skills = this.actor.system.toObject().skills;
    const config = CONFIG.SYSTEM;
    const data = {
      config: config,
      skills: Object.entries(skills).map(([key, skill]) => ({
        key: key,
        faces: skill.faces,
        label: `ARTICHRON.Skills.${key.capitalize()}`
      }))
    };
    data.disabled = new Set(data.skills.map(p => p.faces)).size !== 3;
    return data;
  }

  /** @override */
  _getSubmitData() {
    if (!this.form) throw new Error("The FormApplication subclass has no registered form element");
    const fd = new FormDataExtended(this.form, {editors: this.editors});
    const data = fd.object;
    Object.keys(data).forEach(k => {
      if (k.endsWith(".faces")) data[k] ||= 4;
    });
    return data;
  }

  /** @override */
  async _onChangeInput(event) {
    await super._onChangeInput(event);
    const data = this._getSubmitData();
    const disabled = Object.keys(data).reduce((acc, k) => {
      if (!k.endsWith(".faces")) return acc;
      const n = Number(data[k]);
      acc.add(n);
      return acc;
    }, new Set()).size !== 3;
    this.form.querySelector("[type=submit]").disabled = disabled;
  }
}
