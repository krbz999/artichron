const { HandlebarsApplicationMixin, Application } = foundry.applications.api;

export default class DamageSheet extends HandlebarsApplicationMixin(Application) {
  constructor(options = {}) {
    options.damageId = options.document.id;
    super(options);
    this.#activityId = options.document.activity.id;
    this.#item = options.document.activity.item;
  }

  /* -------------------------------------------------- */
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["artichron"],
    window: {
      contentClasses: ["standard-form"],
      icon: "fa-solid fa-burst",
    },
    position: {
      width: 400,
      height: "auto",
    },
    form: {
      handler: DamageSheet.#onSubmitForm,
      submitOnChange: true,
    },
    tag: "form",
    document: null,
    damageId: null,
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    damage: {
      template: "systems/artichron/templates/item/damage-sheet-damage.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("ARTICHRON.SHEET.DAMAGE_PART.title", {
      name: this.activity.name,
    });
  }

  /* -------------------------------------------------- */

  /**
   * The parent activity of this damage part.
   * @type {BaseActivity}
   */
  get activity() {
    return this.#item.getEmbeddedDocument("Activity", this.#activityId);
  }

  /* -------------------------------------------------- */

  /**
   * The id of the activity this damage part resides on.
   * @type {string}
   */
  #activityId;

  /* -------------------------------------------------- */

  /**
   * The item that has the activity this resides on.
   * @type {ItemArtichron}
   */
  #item;

  /* -------------------------------------------------- */

  /**
   * The damage part.
   * @type {DamageFormulaModel}
   */
  get damage() {
    return this.activity.damage.get(this.options.damageId);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    if (partId === "damage") {
      const makeField = path => {
        return {
          field: this.damage.schema.getField(path),
          value: foundry.utils.getProperty(this.damage, path),
        };
      };

      Object.assign(context, {
        damage: this.damage,
        fields: {
          number: {
            ...makeField("number"),
          },
          denomination: {
            ... makeField("denomination"),
          },
          type: {
            ...makeField("type"), options: artichron.config.DAMAGE_TYPES.optgroups,
          },
          options: {
            ...makeField("options"),
          },
        },
      });
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    this.#item.apps[this.id] = this;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _close(_options) {
    delete this.#item.apps[this.id];
  }

  /* -------------------------------------------------- */

  /**
   * Handle form submission.
   * @this {DamageSheet}
   * @param {PointerEvent} event            Originating click event.
   * @param {HTMLElement} form              The form element.
   * @param {FormDataExtended} formData     The form data.
   */
  static #onSubmitForm(event, form, formData) {
    const submitData = foundry.utils.expandObject(formData.object);
    this.activity.update({ [`damage.${this.options.damageId}`]: submitData });
  }
}
