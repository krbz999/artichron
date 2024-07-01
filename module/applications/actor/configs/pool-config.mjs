import BaseConfig from "./base-config.mjs";

export default class PoolConfig extends BaseConfig {
  /** @override */
  static PARTS = {
    form: {template: "systems/artichron/templates/actor/config/pools.hbs"},
    footer: {template: "systems/artichron/templates/shared/footer.hbs"}
  };

  /* -------------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.format("ARTICHRON.Pools.Config", {name: this.document.name});
  }

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext() {
    return {
      primary: this.document.system.traits.pool,
      primaryChoices: {
        health: "ARTICHRON.Pools.Health",
        stamina: "ARTICHRON.Pools.Stamina",
        mana: "ARTICHRON.Pools.Mana"
      },
      pools: ["health", "stamina", "mana"].map(key => {
        return {
          valueField: this.document.system.schema.getField(`pools.${key}.value`),
          maxField: this.document.system.schema.getField(`pools.${key}.max`),
          label: `ARTICHRON.Pools.${key.capitalize()}DiePl`,
          value: this.document.system.pools[key].value
        };
      }),
      footer: {disabled: false}
    };
  }
}
