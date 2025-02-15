export default class ActivityUseDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  constructor({ activity, usage, dialog, message, ...options } = {}) {
    super(options);
    this.#activityId = activity.id;
    this.#item = activity.item;
    this.#dialog = dialog;
  }

  /* -------------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron", "activity-use-dialog"],
    form: {
      handler: ActivityUseDialog.#submit,
      closeOnSubmit: true,
    },
    position: {
      width: 400,
    },
    tag: "form",
    window: {
      contentClasses: ["standard-form"],
    },
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    consume: {
      template: "systems/artichron/templates/item/activity-use-dialog-consume.hbs",
    },
    damage: {
      template: "systems/artichron/templates/item/activity-use-dialog-damage.hbs",
    },
    healing: {
      template: "systems/artichron/templates/item/activity-use-dialog-healing.hbs",
    },
    defend: {
      template: "systems/artichron/templates/item/activity-use-dialog-defend.hbs",
    },
    template: {
      template: "systems/artichron/templates/item/activity-use-dialog-template.hbs",
    },
    teleport: {
      template: "systems/artichron/templates/item/activity-use-dialog-teleport.hbs",
    },
    elixirs: {
      template: "systems/artichron/templates/item/activity-use-dialog-elixirs.hbs",
    },
    rollMode: {
      template: "systems/artichron/templates/item/activity-use-dialog-rollmode.hbs",
    },
    footer: {
      template: "systems/artichron/templates/shared/footer.hbs",
    },
  };

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
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
    return this.#item.system.activities.get(this.#activityId);
  }

  /* -------------------------------------------------- */

  /**
   * The activity usage configuration.
   * @type {object|null}
   */
  #config = null;

  /* -------------------------------------------------- */

  /**
   * The activity usage configuration.
   * @type {object|null}
   */
  get config() {
    return this.#config ?? null;
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

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    const activity = this.activity;

    switch (partId) {
      case "consume": {
        context.consume = { ...this.#dialog.consume };
        if (!context.consume.show) break;

        context.consume.legend = game.i18n.localize("ARTICHRON.ActivityUseDialog.ConsumeLegend");
        if (context.consume.showAction) {
          context.consume.actionField = new foundry.data.fields.BooleanField({
            initial: true,
            label: "ARTICHRON.ActivityUseDialog.ConsumeActionLabel",
            hint: game.i18n.format("ARTICHRON.ActivityUseDialog.ConsumeActionHint", {
              points: this.activity.cost.value,
            }),
          });
        }
        if (context.consume.showUses) {
          context.consume.usesField = new foundry.data.fields.BooleanField({
            initial: true,
            label: "ARTICHRON.ActivityUseDialog.ConsumeUsesLabel",
            hint: "ARTICHRON.ActivityUseDialog.ConsumeUsesHint",
          });
        }
        break;
      }
      case "damage": {
        context.damage = { ...this.#dialog.damage };
        if (!context.damage.show) break;
        const damages = activity.damage.map(part => {
          return {
            formula: part.formula,
            type: CONFIG.SYSTEM.DAMAGE_TYPES[part.type].label,
          };
        });
        const field = new foundry.data.fields.NumberField({
          integer: true,
          initial: 0,
          nullable: true,
          min: 0,
          label: "ARTICHRON.ActivityUseDialog.DamageLabel",
          hint: "ARTICHRON.ActivityUseDialog.DamageHint",
        });
        Object.assign(context.damage, {
          legend: game.i18n.localize("ARTICHRON.ActivityUseDialog.DamageLegend"),
          damages: damages,
          field: field,
        });
        if (context.damage.ammo) {
          context.damage.ammoField = new foundry.data.fields.StringField({
            required: false,
            blank: true,
            label: "ARTICHRON.ROLL.Damage.AmmoItem",
            hint: "ARTICHRON.ROLL.Damage.AmmoItemHint",
            choices: activity.item.actor.items.reduce((acc, item) => {
              if (item.type !== "ammo") return acc;
              if (item.system.category.subtype === this.#item.system.ammunition.type) {
                acc[item.id] = item.name;
              }
              return acc;
            }, {}),
          });
        }
        break;
      }
      case "healing": {
        context.healing = { ...this.#dialog.healing };
        if (!context.healing.show) break;
        const field = new foundry.data.fields.NumberField({
          integer: true,
          initial: 0,
          nullable: true,
          min: 0,
          label: "ARTICHRON.ActivityUseDialog.HealingLabel",
          hint: "ARTICHRON.ActivityUseDialog.HealingHint",
        });
        Object.assign(context.healing, {
          field: field,
          legend: game.i18n.localize("ARTICHRON.ActivityUseDialog.HealingLegend"),
          formula: activity.healing.formula,
        });
        break;
      }
      case "defend": {
        context.defend = { ...this.#dialog.defend };
        if (!context.defend.show) break;
        const field = new foundry.data.fields.NumberField({
          integer: true,
          initial: 0,
          nullable: true,
          min: 0,
          label: "ARTICHRON.ActivityUseDialog.DefendLabel",
          hint: "ARTICHRON.ActivityUseDialog.DefendHint",
        });
        Object.assign(context.defend, {
          legend: game.i18n.localize("ARTICHRON.ActivityUseDialog.DefendLegend"),
          field: field,
          formula: activity.defend.formula,
        });
        break;
      }
      case "template": {
        context.template = { ...this.#dialog.template };
        if (!context.template.show) break;
        const field = new foundry.data.fields.NumberField({
          integer: true,
          initial: 0,
          nullable: true,
          min: 0,
          label: "ARTICHRON.ActivityUseDialog.TemplateLabel",
          hint: "ARTICHRON.ActivityUseDialog.TemplateHint",
        });
        Object.assign(context.template, {
          legend: game.i18n.localize("ARTICHRON.ActivityUseDialog.TemplateLegend"),
          field: field,
          placeField: new foundry.data.fields.BooleanField({
            label: "ARTICHRON.ActivityUseDialog.TemplatePlaceLabel",
            hint: "ARTICHRON.ActivityUseDialog.TemplatePlaceHint",
          }),
        });
        break;
      }
      case "teleport": {
        context.teleport = { ...this.#dialog.teleport };
        if (!context.teleport.show) break;
        const field = new foundry.data.fields.NumberField({
          integer: true,
          initial: 0,
          nullable: true,
          min: 0,
          label: "ARTICHRON.ActivityUseDialog.TeleportLabel",
          hint: "ARTICHRON.ActivityUseDialog.TeleportHint",
        });
        Object.assign(context.teleport, {
          legend: game.i18n.localize("ARTICHRON.ActivityUseDialog.TeleportLegend"),
          field: field,
        });
        break;
      }
      case "elixirs": {
        context.elixirs = { ...this.#dialog.elixirs };
        if (!context.elixirs.show) break;
        const field = new foundry.data.fields.SetField(new foundry.data.fields.StringField({
          choices: context.elixirs.choices,
        }), {
          hint: "ARTICHRON.ActivityUseDialog.ElixirsHint",
        });
        Object.assign(context.elixirs, {
          legend: game.i18n.localize("ARTICHRON.ActivityUseDialog.ElixirsLegend"),
          field: field,
        });
        break;
      }
      case "rollMode": {
        context.rollMode = { ...this.#dialog.rollMode };
        if (!context.rollMode.show) break;

        const field = new foundry.data.fields.StringField({
          label: "CHAT.RollVisibility",
          required: true,
          choices: Object.entries(CONST.DICE_ROLL_MODES).reduce((acc, [k, v]) => {
            acc[v] = game.i18n.localize(`CHAT.Roll${k.toLowerCase().capitalize()}`);
            return acc;
          }, {}),
        });

        Object.assign(context.rollMode, { field: field });
        break;
      }
      default:
        break;
    }

    return context;
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * @this {ActivityUseDialog}
   * @param {SubmitEvent} event             The originating submit event.
   * @param {HTMLElement} html              The form element.
   * @param {FormDataExtended} formData     The form data.
   */
  static #submit(event, html, formData) {
    const config = foundry.utils.expandObject(formData.object);

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

    this.#config = config;
  }

  /* -------------------------------------------------- */
  /*   Static methods                                   */
  /* -------------------------------------------------- */

  /**
   * Factory method for async behavior.
   * @param {object} options              Application options.
   * @returns {Promise<object|null>}      A promise that resolves to the usage configuration.
   */
  static async create(options) {
    return new Promise(resolve => {
      const application = new this(options);
      application.addEventListener("close", () => resolve(application.config), { once: true });
      application.render({ force: true });
    });
  }
}
