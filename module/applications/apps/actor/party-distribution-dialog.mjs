import Application from "../../api/application.mjs";

/**
 * Application for distributing currency.
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
    recipients: {
      template: "systems/artichron/templates/actor/party-distribution/recipients.hbs",
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
   * Saved references to the amounts being dispensed to targets.
   * @type {Record<string, number>}
   */
  #cached = {};

  /* -------------------------------------------------- */
  /*   Rendering                                        */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch (partId) {
      case "recipients":
        await this.#preparePartContextRecipients(context);
        break;
      case "footer":
        await this.#preparePartContextFooter(context);
        break;
    }
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Modify the rendering context for a specific part.
   * @param {object} context    The rendering context. **will be mutated**
   */
  async #preparePartContextRecipients(context) {
    const recipients = [this.#party].concat(this.#party.system.members.map(m => m.actor));
    const fields = recipients.map(actor => {
      return {
        name: `recipients.${actor.id}.value`,
        value: this.#cached[actor.id] ??= 0,
        dataset: { id: actor.id },
        field: new foundry.data.fields.NumberField({
          nullable: false,
          min: 0,
          max: this.#party.system.currency.award,
          integer: true,
          label: actor.name,
        }),
      };
    });
    Object.assign(context, { recipients: fields });
  }

  /* -------------------------------------------------- */

  /**
   * Modify the rendering context for a specific part.
   * @param {object} context    The rendering context. **will be mutated**
   */
  async #preparePartContextFooter(context) {
    const total = Object.values(this.#cached).reduce((acc, k) => acc + k, 0);
    Object.assign(context, {
      footer: {
        disabled: !total || (total > this.#party.system.currency.award),
        icon: "fa-solid fa-check",
        label: "Confirm",
      },
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    if (partId === "recipients") {
      for (const element of htmlElement.querySelectorAll("[name^=recipients]")) {
        element.addEventListener("change", event => {
          const value = event.currentTarget.value;
          const id = event.currentTarget.closest("[data-id]").dataset.id;
          this.#cached[id] = value;
          this.render({ parts: ["footer"] });
        });
      }
    }
  }
}
