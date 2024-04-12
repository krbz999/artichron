import BaseConfig from "./base-config.mjs";

export default class PoolConfig extends BaseConfig {
  /** @override */
  static get defaultOptions() {
    const options = super.defaultOptions;
    return options;
  }

  /** @override */
  get template() {
    return "systems/artichron/templates/actor/config/pools.hbs";
  }

  /** @override */
  get title() {
    return game.i18n.format("ARTICHRON.Pools.Config", {name: this.actor.name});
  }

  /** @override */
  get id() {
    return `config-pools-${this.actor.uuid.replaceAll(".", "-")}`;
  }

  /** @override */
  getData() {
    const pools = this.actor.system.toObject().pools;
    const config = CONFIG.SYSTEM;
    const data = {
      config: config,
      primary: this.actor.system.traits.pool,
      primaryChoices: {
        health: "ARTICHRON.Pools.Health",
        stamina: "ARTICHRON.Pools.Stamina",
        mana: "ARTICHRON.Pools.Mana"
      },
      pools: Object.entries(pools).map(([key, pool]) => ({
        key: key,
        value: pool.value,
        max: 3, //pool.max,
        faces: pool.faces,
        label: `ARTICHRON.Pools.${key.capitalize()}DiePl`
      }))
    };
    return data;
  }
}
