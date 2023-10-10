import {BaseConfig} from "./base-config.mjs";

export class PoolConfig extends BaseConfig {
  /** @override */
  async getData(options = {}) {
    const pools = this.clone.system.pools;
    return {pools, config: CONFIG};
  }

  /** @override */
  get configType() {
    return "pools";
  }
}
