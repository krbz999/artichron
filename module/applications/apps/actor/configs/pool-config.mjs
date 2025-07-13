import DocumentConfig from "../../../api/document-config.mjs";

export default class HeroPoolConfig extends DocumentConfig {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    position: {},
    window: {
      title: "ARTICHRON.POOL.CONFIG.TITLE",
    },
    form: {},
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    pools: {
      template: "systems/artichron/templates/apps/actor/configs/pool-config/pools.hbs",
    },
  };

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @type {import("../../../../_types").ContextPartHandler} */
  async _preparePartContextPools(context, options) {
    const ctx = context.ctx = {};
    ctx.stamina = Math.clamp(this.document.system.pools.stamina.spent, 0, this.document.system.pools.stamina.max);
    return context;
  }
}
