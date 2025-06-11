import Application from "../../api/application.mjs";

export default class ActivityUseDialog extends Application {
  constructor({ activity, usage, dialog, message, ...options } = {}) {
    super(options);
    this.#activityId = activity.id;
    this.#item = activity.item;
    this.#dialog = dialog;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["activity-use-dialog"],
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    consume: {
      template: "systems/artichron/templates/apps/item/activity-use-dialog/consume.hbs",
    },
    healing: {
      template: "systems/artichron/templates/apps/item/activity-use-dialog/healing.hbs",
    },
    defend: {
      template: "systems/artichron/templates/apps/item/activity-use-dialog/defend.hbs",
    },
    template: {
      template: "systems/artichron/templates/apps/item/activity-use-dialog/template.hbs",
    },
    teleport: {
      template: "systems/artichron/templates/apps/item/activity-use-dialog/teleport.hbs",
    },
    elixirs: {
      template: "systems/artichron/templates/apps/item/activity-use-dialog/elixirs.hbs",
    },
    rollMode: {
      template: "systems/artichron/templates/apps/item/activity-use-dialog/rollmode.hbs",
    },
    footer: {
      template: "systems/artichron/templates/shared/footer.hbs",
    },
  };

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("ARTICHRON.ActivityUseDialog.Title", { name: this.activity.name });
  }

  /* -------------------------------------------------- */

  /**
   * The item whose activity is being used.
   * @type {ItemArtichron}
   */
  #item = null;

  /* -------------------------------------------------- */

  /**
   * The id of the activity being used.
   * @type {string}
   */
  #activityId = null;

  /* -------------------------------------------------- */

  /**
   * The activity being used.
   * @type {BaseActivity}
   */
  get activity() {
    return this.#item.getEmbeddedDocument("Activity", this.#activityId);
  }

  /* -------------------------------------------------- */

  /**
   * Configurations used for the creation of this dialog.
   * @type {object}
   */
  #dialog = null;

  /* -------------------------------------------------- */
  /*   Rendering                                        */
  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextConsume(context, options) {
    const ctx = context.ctx = { ...this.#dialog.consume };
    if (!ctx.show) return context;

    ctx.legend = game.i18n.localize("ARTICHRON.ActivityUseDialog.ConsumeLegend");

    if (ctx.showAction) {
      ctx.actionField = new foundry.data.fields.BooleanField({
        initial: true,
        label: "ARTICHRON.ActivityUseDialog.ConsumeActionLabel",
        hint: game.i18n.format("ARTICHRON.ActivityUseDialog.ConsumeActionHint", {
          points: this.activity.cost.value,
        }),
      });
    }

    if (ctx.showUses) {
      ctx.usesField = new foundry.data.fields.BooleanField({
        initial: true,
        label: "ARTICHRON.ActivityUseDialog.ConsumeUsesLabel",
        hint: "ARTICHRON.ActivityUseDialog.ConsumeUsesHint",
      });
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextHealing(context, options) {
    const ctx = context.ctx = { ...this.#dialog.healing };
    if (!ctx.show) return context;

    const field = new foundry.data.fields.NumberField({
      integer: true,
      initial: 0,
      nullable: true,
      min: 0,
      label: "ARTICHRON.ActivityUseDialog.HealingLabel",
      hint: "ARTICHRON.ActivityUseDialog.HealingHint",
    });

    Object.assign(ctx, {
      field,
      legend: game.i18n.localize("ARTICHRON.ActivityUseDialog.HealingLegend"),
      formula: this.activity.healing.formula,
    });

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextDefend(context, options) {
    const ctx = context.ctx = { ...this.#dialog.defend };
    if (!ctx.show) return context;

    const field = new foundry.data.fields.NumberField({
      integer: true,
      initial: 0,
      nullable: true,
      min: 0,
      label: "ARTICHRON.ActivityUseDialog.DefendLabel",
      hint: "ARTICHRON.ActivityUseDialog.DefendHint",
    });

    Object.assign(ctx, {
      field,
      legend: game.i18n.localize("ARTICHRON.ActivityUseDialog.DefendLegend"),
      formula: this.activity.defend.formula,
    });

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextTemplate(context, options) {
    const ctx = context.ctx = { ...this.#dialog.template };
    if (!ctx.show) return context;

    const field = new foundry.data.fields.NumberField({
      integer: true,
      initial: 0,
      nullable: true,
      min: 0,
      label: "ARTICHRON.ActivityUseDialog.TemplateLabel",
      hint: "ARTICHRON.ActivityUseDialog.TemplateHint",
    });

    Object.assign(ctx, {
      field,
      legend: game.i18n.localize("ARTICHRON.ActivityUseDialog.TemplateLegend"),
      placeField: new foundry.data.fields.BooleanField({
        label: "ARTICHRON.ActivityUseDialog.TemplatePlaceLabel",
        hint: "ARTICHRON.ActivityUseDialog.TemplatePlaceHint",
      }),
    });

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextTeleport(context, options) {
    const ctx = context.ctx = { ...this.#dialog.teleport };
    if (!ctx.show) return context;

    const field = new foundry.data.fields.NumberField({
      integer: true,
      initial: 0,
      nullable: true,
      min: 0,
      label: "ARTICHRON.ActivityUseDialog.TeleportLabel",
      hint: "ARTICHRON.ActivityUseDialog.TeleportHint",
    });

    Object.assign(ctx, {
      field,
      legend: game.i18n.localize("ARTICHRON.ActivityUseDialog.TeleportLegend"),
    });

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextElixirs(context, options) {
    const ctx = context.ctx = { ...this.#dialog.elixirs };
    if (!ctx.show) return context;

    const field = new foundry.data.fields.SetField(new foundry.data.fields.StringField({ choices: ctx.choices }), {
      hint: "ARTICHRON.ActivityUseDialog.ElixirsHint",
    });

    Object.assign(ctx, {
      field,
      legend: game.i18n.localize("ARTICHRON.ActivityUseDialog.ElixirsLegend"),
    });

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextRollMode(context, options) {
    const ctx = context.ctx = { ...this.#dialog.rollMode };
    if (!ctx.show) return context;

    const field = new foundry.data.fields.StringField({
      label: "CHAT.RollVisibility",
      required: true,
      choices: Object.entries(CONST.DICE_ROLL_MODES).reduce((acc, [k, v]) => {
        acc[v] = game.i18n.localize(`CHAT.Roll${k.toLowerCase().capitalize()}`);
        return acc;
      }, {}),
    });

    Object.assign(ctx, {
      field,
    });

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
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  _processSubmitData(event, form, formData, submitOptions) {
    const config = super._processSubmitData(event, form, formData, submitOptions);
    let max;
    switch (this.#item.actor.type) {
      case "monster":
        max = this.#item.actor.system.danger.pool.value;
        break;
      default:
        max = this.#item.actor.system.pools[this.activity.poolType].value;
    }

    if (this.activity.getUsagePoolCost(config) > max) {
      throw new Error(game.i18n.localize("ARTICHRON.ActivityUseDialog.Warning.Overspending"));
    }

    return config;
  }
}
