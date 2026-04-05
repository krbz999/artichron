import Application from "../../api/application.mjs";

export default class SkillRollDialog extends Application {
  constructor({ config, ...options } = {}) {
    super(options);
    this.#config = config;
  }

  /* -------------------------------------------------- */

  /**
   * The dialog configuration.
   * @type {object}
   */
  #config;

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["skill-roll-dialog"],
    position: {
      width: 600,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("ARTICHRON.SKILL.ROLL_DIALOG.TITLE", { name: this.#config.subject.name });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    skills: {
      template: "systems/artichron/templates/apps/actor/skill-roll-dialog/skills.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextSkills(context, options) {
    const ctx = context.ctx = {};
    ctx.base = this.#config.base || "agility";
    ctx.second = this.#config.second || "agility";

    ctx.skills = Object.entries(this.#config.subject.system.skills).map(([k, v]) => {
      return {
        value: k,
        img: artichron.config.SKILLS[k].img,
        label: artichron.config.SKILLS[k].label,
      };
    });

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextFooter(context, options) {
    const ctx = context.ctx = {};
    context.buttons = [{ type: "submit", label: "Confirm", icon: "fa-solid fa-fw fa-check" }];
    return context;
  }
}
