export default class ActivityUseDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor(activity, options = {}) {
    super(options);
    this.#activityId = activity.id;
    this.#item = activity.item;
  }

  /* -------------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron", "activity-use-dialog"],
    form: {
      handler: ActivityUseDialog.#submit
    },
    position: {
      width: 400
    },
    tag: "form",
    window: {
      contentClasses: ["standard-form"]
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    damage: {
      template: "systems/artichron/templates/item/activity-use-dialog-damage.hbs"
    },
    area: {
      template: "systems/artichron/templates/item/activity-use-dialog-area.hbs"
    },
    distance: {
      template: "systems/artichron/templates/item/activity-use-dialog-distance.hbs"
    },
    elixirs: {
      template: "systems/artichron/templates/item/activity-use-dialog-elixirs.hbs"
    },
    footer: {
      template: "systems/artichron/templates/shared/footer.hbs"
    }
  };

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.format("ARTICHRON.ActivityUseDialog.Title", {name: this.activity.name});
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
  /*   Rendering                                        */
  /* -------------------------------------------------- */

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    switch (partId) {
      case "damage": {
        context.damage = {
          show: this.activity.hasDamage
        };
        if (!context.damage.show) break;
        const damages = this.activity._damages.map(({formula, type}) => {
          return {formula, type: CONFIG.SYSTEM.DAMAGE_TYPES[type].label};
        });
        const field = new foundry.data.fields.NumberField({
          integer: true,
          initial: 0,
          nullable: true,
          min: 0,
          label: "ARTICHRON.ActivityUseDialog.DamageLabel",
          hint: "ARTICHRON.ActivityUseDialog.DamageHint"
        });
        Object.assign(context.damage, {
          legend: game.i18n.localize("ARTICHRON.ActivityUseDialog.DamageLegend"),
          damages: damages,
          field: field
        });
        break;
      }
      case "area": {
        context.area = {
          show: this.activity.hasTemplate && (this.activity.item.type === "spell")
        };
        if (!context.area.show) break;
        const field = new foundry.data.fields.NumberField({
          integer: true,
          initial: 0,
          nullable: true,
          min: 0,
          label: "ARTICHRON.ActivityUseDialog.AreaLabel",
          hint: "ARTICHRON.ActivityUseDialog.AreaHint"
        });
        Object.assign(context.area, {
          legend: game.i18n.localize("ARTICHRON.ActivityUseDialog.AreaLegend"),
          field: field
        });
        break;
      }
      case "distance": {
        context.distance = {
          show: this.activity.type === "teleport"
        };
        if (!context.distance.show) break;
        const field = new foundry.data.fields.NumberField({
          integer: true,
          initial: 0,
          nullable: true,
          min: 0,
          label: "ARTICHRON.ActivityUseDialog.DistanceLabel",
          hint: "ARTICHRON.ActivityUseDialog.DistanceHint"
        });
        Object.assign(context.distance, {
          legend: game.i18n.localize("ARTICHRON.ActivityUseDialog.DistanceLegend"),
          field: field
        });
        break;
      }
      case "elixirs": {
        const elixirs = this.activity.item.actor.items.filter(item => {
          return (item.type === "elixir") && item.system.hasUses && (item.system.boost === this.activity.poolType);
        });
        context.elixirs = {show: !!elixirs.length};
        if (!context.elixirs.show) break;
        const field = new foundry.data.fields.SetField(new foundry.data.fields.StringField({
          choices: elixirs.reduce((acc, item) => Object.assign(acc, {[item.id]: item.name}), {})
        }), {
          hint: "ARTICHRON.ActivityUseDialog.ElixirsHint"
        });
        Object.assign(context.elixirs, {
          legend: game.i18n.localize("ARTICHRON.ActivityUseDialog.ElixirsLegend"),
          field: field
        });
        break;
      }
      default: break;
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
    if (this.#item.actor.type === "monster") max = this.#item.actor.system.danger.pool.value;
    else max = this.#item.actor.system.pools[this.activity.poolType].value;

    const {elixirs, ...rest} = config;
    let count = Object.values(rest).reduce((acc, r) => acc + r, 0);
    for (const elixir of elixirs ?? []) {
      const item = this.#item.actor.items.get(elixir);
      if (!item) continue;
      count = count - 1;
    }

    if (count > max) {
      ui.notifications.error("ARTICHRON.ActivityUseDialog.Warning.Overspending", {localize: true});
      return;
    }

    this.#config = config;
    this.close();
  }

  /* -------------------------------------------------- */
  /*   Static methods                                   */
  /* -------------------------------------------------- */

  /**
   * Factory method for async behavior.
   * @param {BaseActivity} activity       The activity being used.
   * @returns {Promise<object|null>}      A promise that resolves to the usage configuration.
   */
  static async create(activity) {
    return new Promise(resolve => {
      const application = new this(activity);
      application.addEventListener("close", () => resolve(application.config), {once: true});
      application.render({force: true});
    });
  }
}
