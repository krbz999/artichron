import BaseConfig from "./base-config.mjs";

export default class PoolConfig extends BaseConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    position: {
      width: 350
    }
  };

  /** @override */
  static PARTS = {
    form: {
      id: "form",
      template: "systems/artichron/templates/actor/config/pools.hbs"
    }
  };

  /** @override */
  get title() {
    return game.i18n.format("ARTICHRON.Pools.Config", {name: this.document.name});
  }

  /** @override */
  async _prepareContext() {
    const fields = artichron.dataModels.actor.hero.schema.fields.pools.fields;
    const pools = this.document.system.toObject().pools;
    const data = {
      primary: this.document.system.traits.pool,
      primaryChoices: {
        health: "ARTICHRON.Pools.Health",
        stamina: "ARTICHRON.Pools.Stamina",
        mana: "ARTICHRON.Pools.Mana"
      },
      pools: ["health", "stamina", "mana"].map(key => {
        const field = fields[key].fields;
        return {
          value: field.value,
          max: field.max,
          label: `ARTICHRON.Pools.${key.capitalize()}DiePl`,
          current: pools[key].value
        };
      })
    };
    return data;
  }
}
