/**
 * Application for awarding currency and progression points.
 * @param {ActorArtichron} party      The party actor dispensing awards.
 * @param {object} [options]          Application rendering options.
 */
export default class AwardDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor(party, options = {}) {
    options.type ??= "currency";
    super(options);
    this.#party = party;
  }

  /* -------------------------------------------------- */

  /**
   * Factory method for asynchronous behavior.
   * @param {ActorArtichron} party      The party actor dispensing awards.
   * @param {string} type               The type of award (currency or points).
   * @param {object} [options]          Application rendering options.
   * @returns {Promise}
   */
  static async create(party, type, options = {}) {
    return new Promise(resolve => {
      options.type = type;
      options.resolve = resolve;
      const application = new this(party, options);
      application.addEventListener("close", () => resolve(null), {once: true});
      application.render({force: true});
    });
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    window: {
      icon: "fa-solid fa-medal",
      contentClasses: ["standard-form"]
    },
    position: {
      width: 400,
      height: "auto"
    },
    tag: "form",
    type: null,
    form: {
      handler: AwardDialog.#onSubmit,
      closeOnSubmit: true
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    inputs: {
      template: "systems/artichron/templates/actor/award-dialog.hbs"
    },
    footer: {
      template: "systems/artichron/templates/shared/footer.hbs"
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.format(`ARTICHRON.AwardDialog.Title${this.options.type.capitalize()}`, {
      name: this.#party.name
    });
  }

  /* -------------------------------------------------- */

  /**
   * A reference to the party actor dispensing awards.
   * @type {ActorArtichron}
   */
  #party = null;

  /* -------------------------------------------------- */

  /**
   * Saved reference to the amount being dispensed.
   * @type {number}
   */
  #amount = null;

  /* -------------------------------------------------- */

  /**
   * Saved reference to the targets being awarded.
   * @type {Set<string>}
   */
  #targets = null;

  /* -------------------------------------------------- */
  /*   Rendering                                        */
  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = {
      formGroups: []
    };

    const choices = this.#party.system.members.reduce((acc, m) => {
      const a = m.actor;
      if ((this.options.type === "currency") || (a.type === "hero")) acc[a.id] = a.name;
      return acc;
    }, {});

    if (!this.#targets) this.#targets = new Set(Object.keys(choices));

    const chron = (this.options.type === "currency") ? this.#party.system.currency.chron : this.#party.system.points.value;
    const divisor = Math.max(1, this.#targets.size);

    context.formGroups.push({
      field: new foundry.data.fields.NumberField({
        nullable: false,
        min: 1,
        step: 1,
        max: Math.max(1, Math.floor(chron / divisor)),
        label: "ARTICHRON.AwardDialog.amount.label",
        hint: `ARTICHRON.AwardDialog.amount.hint${this.options.type.capitalize()}`
      }),
      value: this.#amount ?? 1,
      name: "amount"
    }, {
      field: new foundry.data.fields.SetField(new foundry.data.fields.StringField({choices: choices}), {
        label: "ARTICHRON.AwardDialog.targets.label",
        hint: "ARTICHRON.AwardDialog.targets.hint"
      }),
      value: this.#targets,
      name: "targets",
      type: "checkboxes",
      classes: "stacked"
    });

    context.footer = {
      disabled: !this.#targets.size || (chron / divisor < 1),
      icon: "fa-solid fa-check",
      label: "Confirm"
    };

    return context;
  }

  /* -------------------------------------------------- */

  /** @override */
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    if (partId === "inputs") {
      htmlElement.querySelector("[name=targets]").addEventListener("change", event => {
        this.#targets = new Set(event.currentTarget.value);
        this.render();
      });
      htmlElement.querySelector("[name=amount]").addEventListener("change", event => {
        this.#amount = Number(event.currentTarget.value);
      });
    }
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle submission of the form.
   * @param {PointerEvent} event            The originating click event.
   * @param {HTMLElement} target            The submit element.
   * @param {FormDataExtended} formData     The form data.
   */
  static #onSubmit(event, target, formData) {
    this.options.resolve?.(formData);
  }
}
