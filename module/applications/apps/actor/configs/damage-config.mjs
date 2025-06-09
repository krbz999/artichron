import DocumentConfig from "../../../api/document-config.mjs";

export default class DamageConfig extends DocumentConfig {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    window: {
      title: "ARTICHRON.ATTACK.CONFIG.TITLE",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "systems/artichron/templates/apps/actor/configs/damage-config/form.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @type {import("../../../../_types").ContextPartHandler} */
  async _preparePartContextForm(context, options) {
    const ctx = context.ctx = {};
    const damageTypes = artichron.config.DAMAGE_TYPES.optgroups;
    const attackTypes = artichron.config.BASIC_ATTACKS.optgroups;

    const damageType = this.document._source.system.damage.attack in artichron.config.BASIC_ATTACKS.melee.types
      ? artichron.config.BASIC_ATTACKS.melee.types[this.document._source.system.damage.attack].damageType
      : artichron.config.BASIC_ATTACKS.range.types[this.document._source.system.damage.attack].damageType;

    Object.assign(ctx, {
      damageTypes, attackTypes,
      defaultDamage: game.i18n.format("ARTICHRON.ATTACK.defaultDamageType", {
        type: artichron.config.DAMAGE_TYPES[damageType].label,
      }),
    });

    return context;
  }
}
