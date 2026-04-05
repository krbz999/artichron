import Application from "../../api/application.mjs";

export default class ItemFusionDialog extends Application {
  constructor({ item, ...options }) {

    if (!(item instanceof foundry.documents.Item) || (item.type !== "spell"))
      throw new Error("An ItemFusionDialog must be constructed with a spell item.");

    super(options);
    this.#item = item;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["fusion"],
    window: {
      title: "ARTICHRON.FUSION.title",
      icon: "fa-solid fa-volcano",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    selection: {
      template: "systems/artichron/templates/apps/item/item-fusion-dialog/selection.hbs",
      classes: ["standard-form"],
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The item being fused onto another.
   * @type {foundry.documents.Item}
   */
  #item;

  /* -------------------------------------------------- */

  /**
   * Track the selected target item.
   * @type {string|null}
   */
  #selectedTarget = null;

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format(this.options.window.title, { name: this.#item.name });
  }

  /* -------------------------------------------------- */
  /*   Rendering                                        */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);

    if (partId === "selection") {
      const select = htmlElement.querySelector("[name=target]");
      select.addEventListener("change", (event) => {
        this.#selectedTarget = event.currentTarget.value;
        this.render();
      });
    }
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextSelection(context, options) {
    const armorOptions = this.#item.actor.items.documentsByType.armor
      .map(armor => ({ value: armor.id, label: armor.name }));

    const armor = this.#item.actor.items.get(this.#selectedTarget);

    const ctx = context.ctx = {
      selected: this.#selectedTarget,
      field: new foundry.data.fields.StringField(),
      options: armorOptions,
    };

    ctx.targetImage = armor ? armor.img : foundry.utils.getDocumentClass("Item").getDefaultArtwork({ type: "armor" }).img;
    ctx.sourceImage = this.#item.img;
    ctx.targetDisabled = !armor;

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextFooter(context, options) {
    const ctx = context.ctx = {};
    context.buttons = [{
      label: "ARTICHRON.FUSION.confirm",
      icon: "fa-solid fa-check",
      type: "submit",
      disabled: !this.#item.actor.items.get(this.#selectedTarget),
    }];
    return context;
  }

  /* -------------------------------------------------- */
  /*   Event Handlers                                   */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  _processSubmitData(event, form, formData, submitOptions) {
    return { itemId: this.#selectedTarget };
  }
}
