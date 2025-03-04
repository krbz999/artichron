import Application from "../apps/application.mjs";

/**
 * Application for distributing currency and progression points.
 * @param {ActorArtichron} party      The party actor dispensing currency and points.
 * @param {object} [options]          Application rendering options.
 */
export default class PartyDistributionDialog extends Application {
  constructor({ party, ...options }) {
    options.type ??= "currency";
    super(options);
    this.#party = party;
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    type: null,
    window: {
      icon: "fa-solid fa-medal",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    inputs: {
      template: "systems/artichron/templates/actor/party-distribution-dialog.hbs",
    },
    footer: {
      template: "systems/artichron/templates/shared/footer.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format(`ARTICHRON.PartyDistributionDialog.Title${this.options.type.capitalize()}`, {
      name: this.#party.name,
    });
  }

  /* -------------------------------------------------- */

  /**
   * A reference to the party actor dispensing currency or points.
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
   * Saved reference to the targets being granted currency or points.
   * @type {Set<string>}
   */
  #targets = null;

  /* -------------------------------------------------- */
  /*   Rendering                                        */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = {
      formGroups: [],
    };

    const choices = this.#party.system.members.reduce((acc, m) => {
      const a = m.actor;
      if ((this.options.type === "currency") || (a.type === "hero")) acc[a.id] = a.name;
      return acc;
    }, {});
    if (!this.#targets) this.#targets = new Set(Object.keys(choices));
    if (this.options.type === "currency") choices[this.#party.id] = this.#party.name;

    const funds = (this.options.type === "currency") ? this.#party.system.currency.award : this.#party.system.points.value;
    const divisor = Math.max(1, this.#targets.size);

    context.formGroups.push({
      field: new foundry.data.fields.NumberField({
        nullable: false,
        min: 1,
        step: 1,
        max: Math.max(1, Math.floor(funds / divisor)),
        label: "ARTICHRON.PartyDistributionDialog.amount.label",
        hint: `ARTICHRON.PartyDistributionDialog.amount.hint${this.options.type.capitalize()}`,
      }),
      value: this.#amount ?? 1,
      name: "amount",
    }, {
      field: new foundry.data.fields.SetField(new foundry.data.fields.StringField({ choices: choices }), {
        label: "ARTICHRON.PartyDistributionDialog.targets.label",
        hint: "ARTICHRON.PartyDistributionDialog.targets.hint",
      }),
      value: this.#targets,
      name: "targets",
      type: "checkboxes",
      classes: "stacked",
    });

    context.footer = {
      disabled: !this.#targets.size || (funds / divisor < 1),
      icon: "fa-solid fa-check",
      label: "Confirm",
    };

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
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
}
