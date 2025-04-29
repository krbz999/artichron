import BaseArmorRequirement from "./base-armor-requirement.mjs";

const { NumberField, StringField } = foundry.data.fields;

export default class SkillRequirement extends BaseArmorRequirement {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      skill: new StringField({
        required: true,
        choices: artichron.config.SKILLS,
        initial: "agility",
      }),
      value: new NumberField({
        min: 2,
        initial: 2,
        integer: true,
        nullable: false,
        placeholder: "ARTICHRON.ITEM.REQUIREMENT.Skill.FIELDS.value.placeholder",
      }),
    });
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      hint: "ARTICHRON.ITEM.REQUIREMENT.Skill.hint",
      label: "ARTICHRON.ITEM.REQUIREMENT.Skill.label",
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "skill";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    "ARTICHRON.ITEM.ArmorRequirement",
    "ARTICHRON.ITEM.REQUIREMENT.Skill",
  ];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get fulfilledRequirements() {
    if (this.item.actor?.type !== "hero") return true;
    return this.item.actor.system.skills[this.skill].number >= this.value;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  toRequirement() {
    return game.i18n.format("ARTICHRON.ITEM.REQUIREMENT.Skill.content", {
      skill: artichron.config.SKILLS[this.skill].label,
      value: this.value,
    });
  }
}
