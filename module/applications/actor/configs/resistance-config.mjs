import {BaseConfig} from "./base-config.mjs";

export class ResistanceConfig extends BaseConfig {
  /** @override */
  async getData(options = {}) {
    const resistances = this.clone.system.toObject().resistances;
    return {
      resistances: Object.entries(resistances).map(([key, {bonus}]) => {
        return {...CONFIG.SYSTEM.DAMAGE_TYPES[key], bonus, key};
      })
    };
  }

  /** @override */
  get configType() {
    return "resistances";
  }
}
