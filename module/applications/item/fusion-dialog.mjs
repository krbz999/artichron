const {HandlebarsApplicationMixin, ApplicationV2} = foundry.applications.api;

export default class ItemFusionDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron", "fusion"],
    tag: "form",
    window: {
      width: 400,
      title: "ARTICHRON.ItemFusionDialog.Title",
      icon: "fa-solid fa-volcano"
    },
    form: {
      handler: this._onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: true
    }
  };

  /** @override */
  static PARTS = {
    selections: {template: "systems/artichron/templates/item/fusion-dialog-selections.hbs"},
    indicators: {template: "systems/artichron/templates/item/fusion-dialog-indicators.hbs", dynamic: true},
    changes: {template: "systems/artichron/templates/item/fusion-dialog-changes.hbs", dynamic: true},
    footer: {template: "systems/artichron/templates/item/fusion-dialog-footer.hbs"}
  };

  constructor({item, ...options}) {
    super(options);
    this.item = item;
  }

  /**
   * The item being fused onto another.
   * @type {ItemArtichron}
   */
  item = null;

  /**
   * Track the selected target item.
   * @type {string}
   */
  _selectedTarget = null;

  /**
   * Track the selected fusion.
   * @type {string}
   */
  _selectedFusion = null;

  /** @override */
  get title() {
    return game.i18n.format(this.options.window.title, {source: this.item.name});
  }

  /**
   * Are the selections valid?
   * @type {boolean}
   */
  get isValidSelection() {
    return !!this.item.actor.items.get(this._selectedTarget) && !!this.item.effects.get(this._selectedFusion);
  }

  /* ---------------------------------------- */
  /*                Rendering                 */
  /* ---------------------------------------- */

  /** @override */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options);

    // Add change event listener. This part is never re-rendered.
    this.element.querySelectorAll("[data-change]").forEach(n => {
      n.addEventListener("change", (event) => {
        const change = event.currentTarget.dataset.change;
        const value = event.currentTarget.value;
        if (change === "target") this._selectedTarget = value;
        else if (change === "fusion") this._selectedFusion = value;
        else return;
        this.render();
      });
    });
  }

  /** @override */
  _onRender(context, options) {
    super._onFirstRender(context, options);
    this.element.querySelector("button[type=submit]").disabled = !this.isValidSelection;
  }

  /** @override */
  async _renderHTML(context, options) {
    if (options.isFirstRender) return super._renderHTML(context, options);

    const parts = options.parts.filter(partId => this.constructor.PARTS[partId]?.dynamic);
    options = foundry.utils.deepClone(options);
    options.parts = parts;
    return super._renderHTML(context, options);
  }

  /** @override */
  async _prepareContext(options) {
    const context = {};

    // Selections.
    if (options.isFirstRender) {
      context.target = this._prepareTarget();
      context.fusion = this._prepareFusion();
    }

    // Indicators.
    context.targetImage = this.item.actor.items.get(this._selectedTarget)?.img ?? CONFIG.Item.documentClass.DEFAULT_ICON;
    context.sourceImage = this.item.img;

    return context;
  }

  /**
   * Prepare the target selection.
   * @returns {object}
   */
  _prepareTarget() {
    const targets = this.item.actor.items.filter(item => {
      const isType = (this.item.isArsenal && item.isArsenal) || (this.item.type === item.type);
      return (item !== this.item) && isType && !item.isFused;
    });

    const field = new foundry.data.fields.StringField({
      choices: Object.fromEntries(targets.map(t => [t.id, t.name])),
      label: "ARTICHRON.ItemFusionDialog.TargetLabel"
    });

    return {field: field, dataset: {change: "target"}};
  }

  /**
   * Prepare the fusion selection.
   * @returns {object}
   */
  _prepareFusion() {
    const effects = this.item.effects.filter(effect => effect.transferrableFusion);
    const field = new foundry.data.fields.StringField({
      choices: Object.fromEntries(effects.map(e => [e.id, e.name])),
      label: "ARTICHRON.ItemFusionDialog.FusionLabel"
    });
    return {field: field, dataset: {change: "fusion"}};
  }

  /* ---------------------------------------- */
  /*              EVENT HANDLERS              */
  /* ---------------------------------------- */

  /**
   * Return the selected ids.
   * @returns {{itemId: string, effectId: string}}
   */
  static _onSubmitForm() {
    const data = {itemId: this._selectedTarget, effectId: this._selectedFusion};
    if (this.options.resolve) this.options.resolve(data);
    else return data;
  }

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
