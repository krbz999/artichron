import BaseArmorRequirement from "./base-armor-requirement.mjs";

const { NumberField, StringField } = foundry.data.fields;

export default class SkillRequirement extends BaseArmorRequirement {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      skill: new StringField({
        required: true,
        choices: () => artichron.config.SKILLS,
        initial: "agility",
      }),
      value: new NumberField({ min: 2, initial: 2, integer: true, nullable: false }),
    });
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "skill";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.REQUIREMENT.SKILL",
  ];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get fulfilledRequirements() {
    const actor = this.document.actor;
    if (actor?.type !== "hero") return true;
    return actor.system.skills[this.skill].number >= this.value;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  toRequirement() {
    return game.i18n.format("ARTICHRON.REQUIREMENT.SKILL.content", {
      skill: artichron.config.SKILLS[this.skill].label,
      value: this.value,
    });
  }
}
