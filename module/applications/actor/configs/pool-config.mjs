import BaseConfig from "./base-config.mjs";

export default class PoolConfig extends BaseConfig {
  /** @override */
  static PARTS = {
    form: {template: "systems/artichron/templates/actor/config/pools.hbs"}
  };

  /* -------------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.format("ARTICHRON.PoolConfig.Title", {name: this.document.name});
  }

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext() {
    return {
      pools: ["health", "stamina", "mana"].map(key => {
        const makeField = (path, options = {}) => {
          const field = this.document.system.schema.getField(`pools.${key}.${path}`);
          const value = this.document.system._source.pools[key][path];
          return {field, value, ...options};
        };
        return {
          label: `ARTICHRON.ActorProperty.Pools.${key.capitalize()}.Label`,
          spent: makeField("spent", {max: this.document.system.pools[key].max}),
          faces: makeField("faces"),
          max: makeField("max")
        };
      })
    };
  }
}
