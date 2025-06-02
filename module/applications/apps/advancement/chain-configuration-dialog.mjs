import AdvancementChain from "../../../utils/advancement-chain.mjs";
import Application from "../../api/application.mjs";

export default class ChainConfigurationDialog extends Application {
  constructor({ chains, ...options } = {}) {
    if (!chains) {
      throw new Error(`${ChainConfigurationDialog.name} was constructed without Chains!`);
    }
    super(options);
    this.#chains = chains;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    position: {
      width: 500,
      height: "auto",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    chains: {
      template: "systems/artichron/templates/apps/advancement/chain-configuration-dialog/chains.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  /* -------------------------------------------------- */

  /**
   * The individual advancement chains. These will be mutated by the application
   * and as such cannot be reused for repeat behavior.
   * @type {AdvancementChain[]}
   */
  #chains;

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    switch (partId) {
      case "chains":
        return this.#preparePartContextChains(context, options);
      case "footer":
        return this.#preparePartContextFooter(context, options);
    }
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async #preparePartContextChains(context, options) {
    context.ctx = { chains: this.#chains.map(c => c.active()) };
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async #preparePartContextFooter(context, options) {
    context.buttons = [{ type: "submit", label: "Confirm", icon: "fa-solid fa-fw fa-check" }];
    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _attachPartListeners(partId, element, options) {
    super._attachPartListeners(partId, element, options);

    if (partId === "chains") {
      for (const checkbox of element.querySelectorAll("[data-change=changeOptionalAdvancement]")) {
        checkbox.addEventListener("change", ChainConfigurationDialog.#changeOptionalAdvancement.bind(this));
      }
    }
  }

  /* -------------------------------------------------- */

  /**
   * Select an item.
   * @param {string} advancementUuid    The uuid of the advancement.
   * @param {string} itemUuid           The uuid of the item.
   * @param {boolean} [state=true]      The selected state.
   * @returns {boolean}                 Whether a change was made.
   */
  selectItem(advancementUuid, itemUuid, state = true) {
    let changed = false;
    for (const chain of this.#chains) {
      const result = chain.selectItem(advancementUuid, itemUuid, state);
      changed = changed || result;
    }
    return changed;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _processSubmitData(event, form, formData, submitOptions) {
    // The chain used to create this application is re-used outside,
    // so no reason to return anything but whether to proceed or not.
    return true;
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Mutate the chains when an input is changed.
   * @this {ChainConfigurationDialog}
   * @param {InputEvent} event    The initiating change event.
   */
  static #changeOptionalAdvancement(event) {
    /** @type {HTMLInputElement} */
    const target = event.currentTarget;
    const checked = target.checked;
    const advancementUuid = target.closest("[data-advancement-uuid]").dataset.advancementUuid;
    const itemUuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const changed = this.selectItem(advancementUuid, itemUuid, checked);
    if (changed) this.render({ parts: ["chains"] });
  }
}
