import BaseTraitChoice from "./base-trait-choice.mjs";

const { NumberField, StringField } = foundry.data.fields;

export default class SkillChoice extends BaseTraitChoice {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      value: new NumberField({ min: 1, initial: 1, nullable: false, integer: true }),
      skill: new StringField({
        required: true, initial: "agility", choices: () => artichron.config.SKILLS,
      }),
      subtype: new StringField({
        required: true, initial: "diceNumber", choices: () => artichron.config.TRAIT_SKILL_SUBTYPES,
      }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "skill";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  toString() {
    return game.i18n.format(`ARTICHRON.TRAIT_CHOICE.HINT.skill${this.subtype.capitalize()}`, {
      increase: this.value.signedString(),
      skill: artichron.config.SKILLS[this.skill].label,
    });
  }
}
