import {FormulaField} from "../fields/formula-field.mjs";
import {ResistanceField} from "../fields/resistance-field.mjs";

const {SchemaField, NumberField, SetField, StringField} = foundry.data.fields;

export class ActorSystemModel extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    return {
      health: new SchemaField({
        value: new NumberField({min: 0, integer: true}),
        max: new NumberField({initial: null})
      }),
      favorites: new SetField(new StringField({required: true})),
      resistances: new ResistanceField(),
      defenses: new SchemaField({
        armor: new SchemaField({
          value: new FormulaField({required: true})
        })
      }),
      pips: new SchemaField({
        value: new NumberField({
          min: 0,
          integer: true,
          label: "ARTICHRON.ActorProperty.ActionPoints.Value",
          hint: "ARTICHRON.ActorProperty.ActionPoints.ValueHint"
        }),
        turn: new NumberField({
          min: 0,
          integer: true,
          initial: 2,
          label: "ARTICHRON.ActorProperty.ActionPoints.Turn",
          hint: "ARTICHRON.ActorProperty.ActionPoints.TurnHint"
        })
      })
    };
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Retrieve an object for roll data.
   * @returns {object}
   */
  getRollData() {
    return {...this};
  }

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
  /*   Preparation methods                              */
  /* -------------------------------------------------- */

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  static get BONUS_FIELDS() {
    const bonus = new Set(["name", "img"]);
    bonus.add("system.defenses.armor.value");
    bonus.add("system.pips.turn");
    for (const [k, v] of Object.entries(CONFIG.SYSTEM.DAMAGE_TYPES)) {
      if (v.resist) bonus.add(`system.resistances.${k}.value`);
    }
    return bonus;
  }
}
