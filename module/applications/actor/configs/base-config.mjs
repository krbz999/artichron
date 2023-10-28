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

  /** @override */
  get id() {
    return `config-${this.configType}-${this.actor.uuid.replaceAll(".", "-")}`;
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
      pools: Object.entries(pools).map(([key, pool]) => ({
        key: key,
        value: pool.value,
        max: pool.max,
        faces: pool.faces,
        maxDis: foundry.utils.hasProperty(this.actor.overrides, `system.pools.${key}.max`),
        faceDis: foundry.utils.hasProperty(this.actor.overrides, `system.pools.${key}.faces`),
        label: `ARTICHRON.${key.capitalize()}DiePl`
      })),
      resistances: Object.entries(resistances).map(([key, {bonus}]) => ({
        ...config.DAMAGE_TYPES[key],
        bonus,
        key,
        disabled: foundry.utils.hasProperty(this.actor.overrides, `system.resistances.${key}.bonus`)
      }))
    };
  }

  /** @override */
  async _updateObject(event, formData) {
    return this.actor.update({[`system.${this.configType}`]: formData});
  }
}
