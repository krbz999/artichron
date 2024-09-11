export default class ActivitySelectDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor(item, options = {}) {
    super(options);
    this.#item = item;
  }

  /* -------------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron", "activity-select-dialog"],
    form: {
      handler: ActivitySelectDialog.#submit,
      closeOnSubmit: true
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
    form: {
      template: "systems/artichron/templates/item/activity-select-dialog.hbs"
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
    return game.i18n.format("ARTICHRON.ActivitySelectDialog.Title", {name: this.#item.name});
  }

  /* -------------------------------------------------- */

  /**
   * The item that is being used.
   * @type {ItemArtichron}
   */
  #item = null;

  /* -------------------------------------------------- */

  /**
   * The configuration to be resolved.
   * @type {object|null}
   */
  #config = null;

  /* -------------------------------------------------- */

  /**
   * The configuration to be resolved.
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
    const context = {};
    const activities = [];
    const rollData = this.#item.getRollData();

    for (const [i, activity] of this.#item.system.activities.contents.entries()) {
      const enriched = await TextEditor.enrichHTML(activity.description, {
        rollData: rollData, relativeTo: this.#item
      });
      activities.push({
        name: activity.name,
        img: activity.img || activity.constructor.metadata.icon,
        enriched: enriched,
        active: !i,
        id: activity.id,
        textCssClass: [i ? null : "active", enriched ? null : "faint"].filterJoin(" ")
      });
    }

    context.activities = activities;
    context.footer = {label: "Confirm", icon: "fa-solid fa-check"};

    return context;
  }

  /* -------------------------------------------------- */

  /** @override */
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);

    for (const radio of htmlElement.querySelectorAll("input[type=radio]")) {
      radio.addEventListener("change", event => {
        for (const desc of htmlElement.querySelectorAll(".description")) {
          desc.classList.toggle("active", desc.dataset.id === event.currentTarget.value);
        }
      });
    }
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle form submission.
   * @this {ActivitySelectDialog}
   * @param {SubmitEvent} event             The originating submit event.
   * @param {HTMLElement} html              The form element.
   * @param {FormDataExtended} formData     The form data.
   */
  static #submit(event, html, formData) {
    const config = foundry.utils.expandObject(formData.object);
    this.#config = config;
  }

  /* -------------------------------------------------- */
  /*   Static methods                                   */
  /* -------------------------------------------------- */

  /**
   * Factory method for async behavior.
   * @param {ItemArtichron} item          The item being used.
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
