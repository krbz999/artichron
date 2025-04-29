import PseudoDocument from "../../pseudo-document.mjs";

const { NumberField, SetField, StringField } = foundry.data.fields;

export default class Damage extends PseudoDocument {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      denomination: new NumberField({
        nullable: false,
        initial: 6,
        choices: {
          2: "d2",
          3: "d3",
          4: "d4",
          6: "d6",
          8: "d8",
          10: "d10",
          12: "d12",
          20: "d20",
          100: "d100",
        },
      }),
      number: new NumberField({
        integer: true,
        nullable: false,
        initial: 1,
        min: 1,
      }),
      options: new SetField(new StringField({
        choices: () => Object.fromEntries(Object.entries(artichron.config.ITEM_ATTRIBUTES).filter(([k, v]) => {
          return v.damageOption;
        })),
      })),
      type: new StringField({
        required: true,
        choices: artichron.config.DAMAGE_TYPES,
        initial: "physical",
      }),
    });
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").DamagePartMetadata} */
  static get metadata() {
    return {
      defaultName: "ARTICHRON.DAMAGE.defaultName",
      documentName: "Damage",
      embedded: {},
      sheetClass: artichron.applications.sheets.item.DamageSheet,
      types: {},
    };
  }

  /* -------------------------------------------------- */

  /**
   * Formula representation.
   * @type {string}
   */
  get formula() {
    return `${this.number}d${this.denomination}`;
  }
}
