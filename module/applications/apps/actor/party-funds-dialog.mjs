import Application from "../../api/application.mjs";

export default class PartyFundsDialog extends Application {
  constructor(options) {
    super(options);
    this.#member = options.member;
  }

  /* -------------------------------------------------- */

  /**
   * The member managing funds.
   * @type {ActorArtichron}
   */
  #member = null;

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: [ "party-funds-dialog"],
    window: {
      icon: "fa-solid fa-money-bill-transfer",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "systems/artichron/templates/apps/actor/party-funds-dialog/form.hbs",
    },
    footer: {
      template: "systems/artichron/templates/apps/actor/party-funds-dialog/footer.hbs",
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

  /** @inheritdoc */
  async _onRender(options) {
    await super._onRender(options);
    this.element.querySelector("[name=amount]").addEventListener("change", (event) => {
      event.currentTarget.value = Math.max(event.currentTarget.valueAsNumber, 0);
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _processSubmitData(event, form, formData, submitOptions) {
    const config = super._processSubmitData(event, form, formData, submitOptions);
    config.deposit = event.submitter.dataset.type === "deposit";
    return config;
  }
}
