import DamageSheet from "../../applications/item/damage-sheet.mjs";
import FormulaModel from "./formula-model.mjs";

const { DocumentIdField, SetField, StringField } = foundry.data.fields;

export default class DamageFormulaModel extends FormulaModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      _id: new DocumentIdField({ initial: () => foundry.utils.randomID() }),
      type: new StringField({
        required: true,
        choices: CONFIG.SYSTEM.DAMAGE_TYPES,
        initial: "physical",
      }),
      options: new SetField(new StringField({
        choices: () => Object.fromEntries(Object.entries(CONFIG.SYSTEM.ITEM_ATTRIBUTES).filter(([k, v]) => {
          return v.damageOption;
        })),
      })),
    };
  }

  /* -------------------------------------------------- */

  static metadata = Object.freeze({
    typed: false,
    documentName: "Damage",
  });

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ACTIVITY.FIELDS.damage",
  ];

  /* -------------------------------------------------- */

  /**
   * Registered sheets.
   * @type {Map<string, ApplicationV2>}
   */
  static #sheets = new Map();

  /* -------------------------------------------------- */

  /**
   * Reference to the sheet for this damage part, registered in a static map.
   * @type {DamageSheet}
   */
  get sheet() {
    if (!DamageFormulaModel.#sheets.has(this.uuid)) {
      const cls = new DamageSheet({ document: this });
      DamageFormulaModel.#sheets.set(this.uuid, cls);
    }
    return DamageFormulaModel.#sheets.get(this.uuid);
  }

  /* -------------------------------------------------- */

  /**
   * Formula representation.
   * @type {string}
   */
  get formula() {
    return `${this.number}d${this.denomination}`;
  }

  /* -------------------------------------------------- */

  /**
   * The id of this damage part.
   * @type {string}
   */
  get id() {
    return this._id;
  }

  /* -------------------------------------------------- */

  /**
   * The universally unique identifier of this damage part.
   * @type {string}
   */
  get uuid() {
    return `${this.parent.uuid}.Damage.${this.id}`;
  }

  /* -------------------------------------------------- */

  /**
   * The activity this damage part resides on.
   * @type {BaseActivity}
   */
  get activity() {
    return this.parent;
  }

  /* -------------------------------------------------- */

  async update(change = {}, context = {}) {
    return this.activity.update({ [`damage.${this.id}`]: change }, context);
  }

  /* -------------------------------------------------- */

  async delete(context = {}) {
    return this.activity.update({ [`damage.-=${this.id}`]: null }, context);
  }
}
