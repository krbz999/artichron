export class PoolConfig extends FormApplication {
  constructor(actor) {
    super();
    this.clone = actor.clone({}, {keepId: true});
    this.actor = actor;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 300,
      template: "systems/artichron/templates/actor/config/pools.hbs",
      classes: ["artichron"]
    });
  }

  /** @override */
  get title() {
    return `${game.i18n.localize("ARTICHRON.Pools")}: ${this.actor.name}`;
  }

  /** @override */
  get id() {
    return `config-pools-${this.actor.uuid.replaceAll(".", "-")}`;
  }

  /** @override */
  async getData(options = {}) {
    const pools = this.clone.system.pools;
    return {pools, config: CONFIG};
  }

  /** @override */
  async _updateObject(event, formData) {
    console.warn(event, formData);
    return this.actor.update({"system.pools": formData});
  }

  /** @override */
  async _onChangeInput(event) {
    const {name, value} = event.currentTarget;
    await super._onChangeInput(event);
    this.clone.updateSource({[`system.pools.${name}`]: value});
    return this.render();
  }
}
