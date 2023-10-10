export class BaseConfig extends FormApplication {
  constructor(actor, type) {
    super();
    this.clone = actor.clone({}, {keepId: true});
    this.actor = actor;
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

  /** @override */
  get id() {
    return `config-${this.configType}-${this.actor.uuid.replaceAll(".", "-")}`;
  }

  /**
   * What type of config is this?
   * @type {string}
   */
  get configType() {
    return null;
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
    // must be subclassed.
  }

  /** @override */
  async _updateObject(event, formData) {
    return this.actor.update({[`system.${this.configType}`]: formData});
  }

  /** @override */
  async _onChangeInput(event) {
    const {name, value} = event.currentTarget;
    await super._onChangeInput(event);
    this.clone.updateSource({[`system.${this.configType}.${name}`]: value});
    return this.render();
  }
}
