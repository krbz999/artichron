import Application from "../../api/application.mjs";

export default class ActivitySelectDialog extends Application {
  constructor({ item, ...options }) {
    super(options);
    this.#item = item;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["activity-select-dialog"],
    actions: {
      selectActivity: ActivitySelectDialog.#selectActivity,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "systems/artichron/templates/apps/pseudo/activity/select-dialog/form.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("ARTICHRON.ACTIVITY.SELECT.TITLE", { name: this.#item.name });
  }

  /* -------------------------------------------------- */

  /**
   * The item that is being used.
   * @type {foundry.documents.Item}
   */
  #item = null;

  /* -------------------------------------------------- */

  /**
   * The selected activity.
   * @type {string}
   */
  #selected;

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextForm(context, options) {
    const ctx = context.ctx = { activities: [] };
    const rollData = this.#item.getRollData();
    const Editor = foundry.applications.ux.TextEditor.implementation;

    for (const activity of this.#item.getEmbeddedPseudoDocumentCollection("Activity")) {
      this.#selected ??= activity.id;
      const active = this.#selected === activity.id;

      if (active) {
        ctx.enriched = await Editor.enrichHTML(activity.description, { rollData, relativeTo: this.#item });
      }

      ctx.activities.push({
        active,
        document: activity,
        classes: [active ? "" : "inactive"].filter(_ => _),
      });
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextFooter(context, options) {
    const ctx = context.ctx = {};
    context.buttons = [{ type: "submit", label: "Confirm", icon: "fa-solid fa-check" }];
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Select activity.
   * @this {ActivitySelectDialog}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #selectActivity(event, target) {
    this.#selected = target.dataset.pseudoId;
    this.render();
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _processSubmitData(event, form, formData, submitOptions) {
    const config = { activity: this.#selected };
    return config;
  }
}
