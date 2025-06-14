import PseudoDocument from "../pseudo-document.mjs";

const { NumberField, SetField, StringField } = foundry.data.fields;

export default class Damage extends PseudoDocument {
  /** @type {import("../../../_types").PseudoDocumentMetadata} */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      defaultImage: "systems/artichron/assets/icons/pseudo/damage.svg",
      documentName: "Damage",
      sheetClass: artichron.applications.sheets.pseudo.DamageSheet,
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      denomination: new NumberField({
        nullable: false,
        initial: 6,
      }),
      number: new NumberField({
        integer: true,
        nullable: true,
        initial: null,
        min: 1,
      }),
      damageTypes: new SetField(new StringField({
        choices: () => artichron.config.DAMAGE_TYPES,
      }), { initial: () => ["physical"], min: 1 }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["ARTICHRON.DAMAGE"];

  /* -------------------------------------------------- */

  /**
   * Formula representation.
   * @type {string}
   */
  get formula() {
    return `${this.number}d${this.denomination}`;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareBaseData() {
    super.prepareBaseData();
    this.number ??= 1;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.damageType = this.damageTypes.first() ?? null;
  }
}
