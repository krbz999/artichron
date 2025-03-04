import Application from "../apps/application.mjs";

export default class ActivitySelectDialog extends Application {
  constructor({ item, ...options }) {
    super(options);
    this.#item = item;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["activity-select-dialog"],
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "systems/artichron/templates/item/activity-select-dialog.hbs",
    },
    footer: {
      template: "systems/artichron/templates/shared/footer.hbs",
    },
  };

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("ARTICHRON.ActivitySelectDialog.Title", { name: this.#item.name });
  }

  /* -------------------------------------------------- */

  /**
   * The item that is being used.
   * @type {ItemArtichron}
   */
  #item = null;

  /* -------------------------------------------------- */
  /*   Rendering                                        */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = {};
    const activities = [];
    const rollData = this.#item.getRollData();

    for (const [i, activity] of this.#item.system.activities.contents.entries()) {
      const enriched = await TextEditor.enrichHTML(activity.description, {
        rollData: rollData, relativeTo: this.#item,
      });
      activities.push({
        name: activity.name,
        img: activity.img || activity.constructor.metadata.icon,
        enriched: enriched,
        active: !i,
        id: activity.id,
        textCssClass: [i ? null : "active", enriched ? null : "faint"].filterJoin(" "),
      });
    }

    context.activities = activities;
    context.footer = { label: "Confirm", icon: "fa-solid fa-check" };

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
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

  /** @inheritdoc */
  _processSubmitData(event, form, formData, submitOptions) {
    const config = super._processSubmitData(event, form, formData, submitOptions);
    if (game.keyboard.isModifierActive(KeyboardManager.MODIFIER_KEYS.SHIFT)) config.configure = false;
    return config;
  }
}
