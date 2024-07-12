const {HandlebarsApplicationMixin, ApplicationV2} = foundry.applications.api;

export default class ItemFusionDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron", "fusion"],
    tag: "form",
    window: {
      title: "ARTICHRON.ItemFusionDialog.Title",
      icon: "fa-solid fa-volcano",
      contentClasses: ["standard-form"]
    },
    position: {width: 400},
    form: {
      handler: this.#onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: true
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    selections: {template: "systems/artichron/templates/item/fusion-dialog-selections.hbs"},
    indicators: {template: "systems/artichron/templates/item/fusion-dialog-indicators.hbs"},
    changes: {template: "systems/artichron/templates/item/fusion-dialog-changes.hbs"},
    footer: {template: "systems/artichron/templates/shared/footer.hbs"}
  };

  /* -------------------------------------------------- */

  /**
   * @class
   * @param {object} options                  Application rendering options.
   * @param {ItemArtichron} options.item      The item being fused onto another.
   */
  constructor({item, ...options}) {
    super(options);
    this.#item = item;
  }

  /* -------------------------------------------------- */

  /**
   * The item being fused onto another.
   * @type {ItemArtichron}
   */
  #item = null;

  /* -------------------------------------------------- */

  /**
   * Track the selected target item.
   * @type {string}
   */
  #selectedTarget = null;

  /* -------------------------------------------------- */

  /**
   * Track the selected fusion.
   * @type {string}
   */
  #selectedFusion = null;

  /* -------------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.format(this.options.window.title, {source: this.#item.name});
  }

  /* -------------------------------------------------- */
  /*   Rendering                                        */
  /* -------------------------------------------------- */

  /** @override */
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);

    if (partId === "selections") {
      htmlElement.querySelectorAll("[data-change]").forEach(n => {
        n.addEventListener("change", (event) => {
          const change = event.currentTarget.dataset.change;
          const value = event.currentTarget.value;
          if (change === "target") this.#selectedTarget = value;
          else if (change === "fusion") this.#selectedFusion = value;
          else return;
          this.render({parts: ["indicators", "changes", "footer"]});
        });
      });
    }
  }

  /* -------------------------------------------------- */

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if (partId === "selections") {
      const {StringField} = foundry.data.fields;

      // Target.
      const tChoices = {};
      for (const item of this.#item.actor.items) {
        if (item === this.#item) continue;
        if ((this.#item.isArsenal && item.isArsenal) || (this.#item.type === item.type)) {
          tChoices[item.id] = item.name;
        }
      }
      context.target = {
        field: new StringField({
          choices: tChoices,
          label: "ARTICHRON.ItemFusionDialog.TargetLabel"
        }),
        dataset: {change: "target"}
      };

      // Fusion.
      const eChoices = {};
      for (const effect of this.#item.effects) {
        if (effect.isTransferrableFusion) eChoices[effect.id] = effect.name;
      }
      context.fusion = {
        field: new StringField({
          choices: eChoices,
          label: "ARTICHRON.ItemFusionDialog.FusionLabel"
        }),
        dataset: {change: "fusion"}
      };
    } else if (partId === "indicators") {
      const target = this.#item.actor.items.get(this.#selectedTarget);
      context.targetImage = target?.img ?? Item.implementation.getDefaultArtwork({}).img;
      context.sourceImage = this.#item.img;
      context.targetDisabled = !target;
    } else if (partId === "changes") {
      const effect = this.#item.effects.get(this.#selectedFusion);
      context.changes = effect ? effect.system.translateChanges() : null;
    } else if (partId === "footer") {
      context.footer = {
        disabled: !this.#item.actor.items.get(this.#selectedTarget) || !this.#item.effects.get(this.#selectedFusion)
      };
    }
    return context;
  }

  /* -------------------------------------------------- */
  /*   Event Handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Return the selected ids.
   * @this {ItemFusionDialog}
   * @returns {{itemId: string, effectId: string}}
   */
  static #onSubmitForm() {
    const data = {itemId: this.#selectedTarget, effectId: this.#selectedFusion};
    if (this.options.resolve) this.options.resolve(data);
    else return data;
  }

  /* -------------------------------------------------- */
  /*   Factory methods                                  */
  /* -------------------------------------------------- */

  /**
   * Create an asynchronous instance of this application.
   * @param {ItemArtichron} item      The item being fused onto another.
   * @returns {Promise<any>}          The relevant ids, or null if the application is closed.
   */
  static async create(item) {
    return new Promise(resolve => {
      const dialog = new this({item, resolve});
      dialog.addEventListener("close", () => resolve(null), {once: true});
      dialog.render({force: true});
    });
  }
}
