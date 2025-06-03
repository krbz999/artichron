import DocumentConfig from "../../../api/document-config.mjs";

export default class SkillConfig extends DocumentConfig {
  constructor({ skill, ...options } = {}) {
    super(options);
    if (skill in artichron.config.SKILLS) this.tabGroups.primary = skill;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    window: {
      title: "ARTICHRON.SKILL.CONFIG.TITLE",
    },
    sheetConfig: false,
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    agility: {
      template: "systems/artichron/templates/apps/actor/configs/skill-config/skill.hbs",
    },
    brawn: {
      template: "systems/artichron/templates/apps/actor/configs/skill-config/skill.hbs",
    },
    mind: {
      template: "systems/artichron/templates/apps/actor/configs/skill-config/skill.hbs",
    },
    spirit: {
      template: "systems/artichron/templates/apps/actor/configs/skill-config/skill.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "agility", icon: "fa-solid fa-fw fa-feather-pointed" },
        { id: "brawn", icon: "fa-solid fa-fw fa-hand-fist" },
        { id: "mind", icon: "fa-solid fa-fw fa-brain" },
        { id: "spirit", icon: "fa-solid fa-fw fa-spa" },
      ],
      labelPrefix: "ARTICHRON.SKILL",
      initial: "agility",
    },
  };

  /* -------------------------------------------------- */

  /** @type {import("../../../../_types").ContextPartHandler} */
  async _preparePartContextAgility(context, options) {
    context.ctx = {
      skill: "agility",
      fields: context.systemFields.skills.fields.agility.fields,
    };
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../../_types").ContextPartHandler} */
  async _preparePartContextBrawn(context, options) {
    context.ctx = {
      skill: "brawn",
      fields: context.systemFields.skills.fields.brawn.fields,
    };
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../../_types").ContextPartHandler} */
  async _preparePartContextMind(context, options) {
    context.ctx = {
      skill: "mind",
      fields: context.systemFields.skills.fields.mind.fields,
    };
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../../_types").ContextPartHandler} */
  async _preparePartContextSpirit(context, options) {
    context.ctx = {
      skill: "spirit",
      fields: context.systemFields.skills.fields.spirit.fields,
    };
    return context;
  }
}
