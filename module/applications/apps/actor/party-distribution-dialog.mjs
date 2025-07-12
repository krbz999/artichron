import Application from "../../api/application.mjs";

export default class PartyDistributionDialog extends Application {
  constructor({ party, type = "currency", ...options }) {
    super(options);
    this.#type = type;
    this.#party = party;
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    window: {
      icon: "fa-solid fa-medal",
    },
    actions: {
      splitEvenly: PartyDistributionDialog.#splitEvenly,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    recipients: {
      template: "systems/artichron/templates/apps/actor/party-distribution-dialog/recipients.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    if (this.#type === "currency") return game.i18n.format("ARTICHRON.DISTRIBUTE.title", { name: this.#party.name });
    return game.i18n.format("ARTICHRON.DISTRIBUTE.titlePoints", { name: this.#party.name });
  }

  /* -------------------------------------------------- */

  /**
   * A reference to the party actor dispensing currency or points.
   * @type {ActorArtichron}
   */
  #party;

  /* -------------------------------------------------- */

  /**
   * What is being distributed.
   * @type {"currency"|"points"}
   */
  #type;

  /* -------------------------------------------------- */

  /**
   * Saved references to the amounts being dispensed to targets.
   * @type {Record<string, number>}
   */
  #cached = {};

  /* -------------------------------------------------- */
  /*   Rendering                                        */
  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextRecipients(context, options) {
    const ctx = context.ctx = {};
    let recipients = this.#party.system.members.map(m => m.actor);
    if (this.#type === "points") recipients = recipients.filter(actor => actor.type === "hero");

    const fields = recipients.map(actor => {
      const max = this.#type === "currency" ? this.#party.system.currency.funds : this.#party.system.points.value;
      return {
        name: `recipients.${actor.id}.value`,
        value: this.#cached[actor.id] ??= 0,
        dataset: { id: actor.id },
        field: new foundry.data.fields.NumberField({
          max,
          nullable: false,
          min: 0,
          integer: true,
          label: actor.name,
        }),
      };
    });
    ctx.recipients = fields;
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextFooter(context, options) {
    const ctx = context.ctx = {};
    const total = Object.values(this.#cached).reduce((acc, k) => acc + k, 0);
    const max = this.#type === "currency" ? this.#party.system.currency.funds : this.#party.system.points.value;
    context.buttons = [{
      action: "splitEvenly",
      type: "button",
      icon: "fa-solid fa-scale-balanced",
      disabled: false,
      label: "ARTICHRON.DISTRIBUTE.splitEvenly",
    }, {
      type: "submit",
      icon: "fa-solid fa-check",
      disabled: !total || (total > max),
      label: "ARTICHRON.DISTRIBUTE.confirm",
    }];
    return context;
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

  /* -------------------------------------------------- */

  /**
   * Split the values evenly across all recipients.
   * @this {PartyDistributionDialog}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #splitEvenly(event, target) {
    const path = this.#type === "currency" ? "system.currency.funds" : "system.points.value";
    const total = foundry.utils.getProperty(this.#party, path);
    const actors = this.element.querySelectorAll("[name^=recipients]");
    const fraction = Math.floor(total / actors.length);
    for (const input of actors) input.value = fraction;
    // this.render({ parts: ["foot"]})
  }
}
