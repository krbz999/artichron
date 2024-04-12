export default class BaseConfig extends FormApplication {
  constructor(actor, options = {}) {
    super(actor);
    this.actor = actor;
    this.trait = options.trait;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300,
      classes: ["artichron"]
    });
  }

  /** @override */
  get template() {
    return `systems/artichron/templates/actor/config/${this.configType}.hbs`;
  }

  /** @override */
  get title() {
    const label = `ARTICHRON.${this.configType.capitalize()}`;
    return `${game.i18n.localize(label)}: ${this.actor.name}`;
  }

  /**
   * What type of config is this?
   * @type {string}
   */
  get configType() {
    return this.trait;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html[0].querySelectorAll("INPUT[type=text], INPUT[type=number]").forEach(n => {
      n.addEventListener("focus", event => event.currentTarget.select());
    });
  }

  /** @override */
  async getData(options = {}) {
    const {pools, resistances} = this.actor.system.toObject();
    const config = CONFIG.SYSTEM;
    return {
      config: config,
      resistances: Object.entries(resistances).map(([key, {bonus}]) => ({
        ...config.DAMAGE_TYPES[key],
        bonus,
        key
      }))
    };
  }

  /** @override */
  async _updateObject(event, formData) {
    return this.actor.update(formData);
  }
}
