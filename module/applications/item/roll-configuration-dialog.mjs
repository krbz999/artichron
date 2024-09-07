/**
 * A utility dialog class that constructs a form at will.
 */
export default class RollConfigurationDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron", "roll-configuration-dialog"],
    form: {
      handler: RollConfigurationDialog.#submit
    },
    position: {
      width: 400,
      height: "auto"
    },
    tag: "form",
    window: {
      title: "",
      contentClasses: ["standard-form"]
    },
    document: null,
    fieldsets: null
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    form: {
      template: "systems/artichron/templates/shared/roll-configuration-dialog.hbs"
    },
    footer: {
      template: "systems/artichron/templates/shared/footer.hbs"
    }
  };

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The form data.
   * @type {object|null}
   */
  #config = null;

  /* -------------------------------------------------- */

  /**
   * The form data.
   * @type {object|null}
   */
  get config() {
    return this.#config ?? null;
  }

  /* -------------------------------------------------- */
  /*   Rendering                                        */
  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = {
      fieldsets: []
    };

    for (const {legend, fields} of this.options.fieldsets ?? []) {
      const fieldset = {
        legend: legend ? game.i18n.localize(legend) : null,
        fields: []
      };
      for (const {field, options} of fields) {
        const html = field.toFormGroup({localize: true}, options).outerHTML;
        fieldset.fields.push(html);
      }
      context.fieldsets.push(fieldset);
    }

    // Add fieldset for roll mode.
    context.fieldsets.push({
      legend: null,
      fields: [
        new foundry.data.fields.StringField({
          label: "CHAT.RollVisibility",
          required: true,
          choices: Object.entries(CONST.DICE_ROLL_MODES).reduce((acc, [k, v]) => {
            acc[v] = game.i18n.localize(`CHAT.Roll${k.toLowerCase().capitalize()}`);
            return acc;
          }, {})
        }).toFormGroup({localize: true}, {
          name: "rollmode",
          value: game.settings.get("core", "rollMode")
        }).outerHTML
      ]
    });

    return context;
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * @this {RollConfigurationDialog}
   * @param {SubmitEvent} event             The originating submit event.
   * @param {HTMLElement} html              The form element.
   * @param {FormDataExtended} formData     The form data.
   */
  static #submit(event, html, formData) {
    this.#config = foundry.utils.expandObject(formData.object);
    this.close();
  }

  /* -------------------------------------------------- */
  /*   Static methods                                   */
  /* -------------------------------------------------- */

  /**
   * Factory method for async behavior.
   * @param {object} options              Dialog options.
   * @returns {Promise<object|null>}      A promise that resolves to the configured form data.
   */
  static async create(options) {
    return new Promise(resolve => {
      const application = new this(options);
      application.addEventListener("close", () => resolve(application.config), {once: true});
      application.render({force: true});
    });
  }
}
