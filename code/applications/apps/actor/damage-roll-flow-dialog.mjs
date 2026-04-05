import Application from "../../api/application.mjs";

export default class DamageRollFlowDialog extends Application {
  constructor({ flow, ...options } = {}) {
    if (!(flow instanceof artichron.dice.DamageRollFlow)) {
      throw new Error(`A ${DamageRollFlowDialog.name} cannot be constructed without a DamageRollFlow!`);
    }
    super(options);
    this.#flow = flow;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["damage-roll-flow-dialog"],
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    formulas: {
      template: "systems/artichron/templates/apps/damage/damage-roll-flow-dialog/formulas.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("ARTICHRON.DAMAGE.TITLE", { name: this.#flow.config.subject.name });
  }

  /* -------------------------------------------------- */

  /**
   * The damage roll flow object.
   * @type {artichron.dice.DamageRollFlow}
   */
  #flow;

  /* -------------------------------------------------- */

  /**
   * The actor performing the damage roll.
   * @type {foundry.documents.Actor}
   */
  get actor() {
    return this.#flow.config.subject;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextFormulas(context, options) {
    const ctx = context.ctx = { formulas: [] };

    for (const [i, rollConfig] of this.#flow.rolls.entries()) {
      const rollData = {
        formula: rollConfig.formula,
        damageType: artichron.config.DAMAGE_TYPES[rollConfig.damageType]?.label ?? rollConfig.damageType,
        damageTypes: Array.from(rollConfig.options.damageTypes)
          .filter(type => type in artichron.config.DAMAGE_TYPES)
          .map(type => ({ value: type, label: artichron.config.DAMAGE_TYPES[type].label })),
        index: i,
      };
      rollData.damageOptions = rollData.damageTypes.length > 1;
      ctx.formulas.push(rollData);
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextFooter(context, options) {
    const ctx = context.ctx = {};
    context.buttons = [{ type: "submit", label: "Confirm", icon: "fa-solid fa-check" }];
    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _processSubmitData(event, form, formData, submitOptions) {
    formData = super._processSubmitData(event, form, formData, submitOptions);
    for (const [k, v] of Object.entries(formData.bonus)) {
      const roll = this.#flow.rolls[k];
      const terms = [...roll.terms];

      if (v && foundry.dice.Roll.validate(v)) {
        terms.push(
          new foundry.dice.terms.OperatorTerm({ operator: "+" }),
          ...new foundry.dice.Roll(v, roll.data).terms,
        );
      }

      const damageType = formData.damageType?.[k] ?? roll.options.damageType;
      this.#flow.rolls[k] = artichron.dice.rolls.DamageRoll.fromTerms(terms, { ...roll.options, damageType });
    }

    return true;
  }
}
