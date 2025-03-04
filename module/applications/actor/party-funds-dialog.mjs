import ActorArtichron from "../../documents/actor.mjs";

export default class PartyFundsDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
) {
  constructor(options) {
    super(options);
    this.#party = options.party;
    this.#member = options.member;
  }

  /* -------------------------------------------------- */

  /**
   * The party actor.
   * @type {ActorArtichron}
   */
  #party = null;

  /* -------------------------------------------------- */

  /**
   * The member managing funds.
   * @type {ActorArtichron}
   */
  #member = null;

  /* -------------------------------------------------- */

  /**
   * Stored form data.
   * @type {object|null}
   */
  #config = null;

  /* -------------------------------------------------- */

  /**
   * Stored form data.
   * @type {object|null}
   */
  get config() {
    return this.#config;
  }

  /* -------------------------------------------------- */

  /**
   * Factory method for asynchronous behavior.
   * @param {object} options                    Application rendering options.
   * @param {ActorArtichron} options.party      The party actor.
   * @param {ActorArtichron} options.member     The member managing funds.
   * @returns {Promise}
   */
  static async create(options) {
    return new Promise(resolve => {
      const application = new this(options);
      application.addEventListener("close", () => resolve(application.config), { once: true });
      application.render({ force: true });
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["artichron", "party-funds-dialog"],
    window: {
      icon: "fa-solid fa-money-bill-transfer",
      contentClasses: ["standard-form"],
    },
    position: {
      width: 400,
      height: "auto",
    },
    tag: "form",
    form: {
      handler: PartyFundsDialog.#handler,
      closeOnSubmit: true,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "systems/artichron/templates/actor/party-funds-dialog.hbs",
    },
    footer: {
      template: "systems/artichron/templates/actor/party-funds-dialog-footer.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("ARTICHRON.PartyFundsDialog.Title", {
      name: this.#member.name,
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const field = new foundry.data.fields.NumberField({
      nullable: false,
      label: "ARTICHRON.PartyFundsDialog.label",
      hint: "ARTICHRON.PartyFundsDialog.hint",
    });

    return {
      field: field,
    };
  }

  /* -------------------------------------------------- */

  _onRender(options) {
    super._onRender(options);
    this.element.querySelector("[name=amount]").addEventListener("change", (event) => {
      event.currentTarget.value = Math.max(event.currentTarget.valueAsNumber, 0);
    });
  }

  /* -------------------------------------------------- */

  /**
   * Handle form submission.
   * @this {PartyFundsDialog}
   * @param {PointerEvent} event            The originating click event.
   * @param {HTMLElement} form              The form element.
   * @param {FormDataExtended} formData     The form data.
   */
  static #handler(event, form, formData) {
    this.#config = foundry.utils.expandObject(formData.object);
    this.#config.deposit = event.submitter.dataset.type === "deposit";
  }
}
