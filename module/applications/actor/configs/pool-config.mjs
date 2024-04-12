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
    return game.i18n.format("ARTICHRON.PoolConfig.Title", {name: this.actor.name});
  }

  /** @override */
  getData() {
    const pools = this.actor.system.toObject().pools;
    const config = CONFIG.SYSTEM;
    const data = {
      config: config,
      pools: Object.entries(pools).map(([key, pool]) => ({
        key: key,
        value: pool.value,
        max: 3, //pool.max,
        faces: pool.faces,
        label: `ARTICHRON.${key.capitalize()}DiePl`
      }))
    };
    data.disabled = new Set(data.pools.map(p => p.faces)).size !== 3;
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
