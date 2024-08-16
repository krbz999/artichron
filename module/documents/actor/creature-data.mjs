import ActorSystemModel from "./system-model.mjs";

const {SchemaField, NumberField, SetField, StringField} = foundry.data.fields;

/**
 * Extended data model for actor types that participate in combat.
 */
export default class CreatureData extends ActorSystemModel {
  static defineSchema() {
    return {
      health: new SchemaField({
        value: new NumberField({min: 0, initial: 0, integer: true, nullable: false}),
        max: new NumberField({initial: null})
      }),
      favorites: new SetField(new StringField({required: true})),
      pips: new SchemaField({
        value: new NumberField({min: 0, initial: 0, step: 1}),
        turn: new NumberField({min: 0, initial: 1, step: 1, nullable: false})
      })
    };
  }

  /* -------------------------------------------------- */
  /*   Data preparation                                 */
  /* -------------------------------------------------- */

  /* -------------------------------------------------- */
  /*   Life-cycle methods                               */
  /* -------------------------------------------------- */

  /**
   * Modify the update to the system data model.
   * @param {object} update       The update to any system-specific properties.
   * @param {object} options      The update options.
   * @param {User} user           The user performing the update.
   */
  async _preUpdate(update, options, user) {
    const allowed = await super._preUpdate(update, options, user);
    if (allowed === false) return false;
    const health = update.system?.health ?? {};
    if ("value" in health) {
      health.value = Math.clamp(health.value, 0, this.health.max);
      options.health = {o: this.health.value};
    }
  }

  /* -------------------------------------------------- */

  /** @override */
  _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);
    if (options.health) {
      options.health.n = this.health.value;
      options.health.delta = options.health.n - options.health.o;
    }
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  static get BONUS_FIELDS() {
    const bonus = super.BONUS_FIELDS;
    bonus.add("system.defenses.armor");
    bonus.add("system.pips.turn");
    for (const k of Object.keys(CONFIG.SYSTEM.DAMAGE_TYPE_GROUPS)) {
      bonus.add(`system.bonuses.damage.${k}`);
    }
    for (const [k, v] of Object.entries(CONFIG.SYSTEM.DAMAGE_TYPES)) {
      if (v.resist) bonus.add(`system.resistances.${k}`);
    }
    return bonus;
  }
}
