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
    classes: ["chain-configuration-dialog"],
    position: {
      width: 500,
      height: "auto",
    },
    actions: {
      changeOptionalAdvancement: ChainConfigurationDialog.#changeOptionalAdvancement,
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

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextChains(context, options) {
    context.ctx = { chains: this.#chains.map(c => c.active()) };
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextFooter(context, options) {
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

  getByAdvancement(uuid) {
    for (const chain of this.#chains) {
      const node = chain.getByAdvancement(uuid);
      if (node) return node;
    }
    return null;
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
   * Configure an advancement, then mutate the chains and re-render.
   * @this {ChainConfigurationDialog}
   * @param {PointerEvent} event          The initiating click event.
   * @param {HTMLButtonElement} target    The capturing HTML element which defined a [data-action].
   */
  static async #changeOptionalAdvancement(event, target) {
    const advancementUuid = target.closest("[data-advancement-uuid]").dataset.advancementUuid;
    const node = this.getByAdvancement(advancementUuid);

    const options = Object.values(node.choices).map(c => ({ value: c.item.uuid, label: c.item.name }));

    const div = document.createElement("DIV");
    const input = foundry.applications.fields.createMultiSelectInput({
      options,
      type: "checkboxes",
      name: "itemUuids",
    });
    div.insertAdjacentElement("beforeend", input);
    const result = await artichron.applications.api.Dialog.input({
      content: div,
      render: (event, dialog) => {
        const element = dialog.element.querySelector("[name=itemUuids]");
        element.addEventListener("change", () => {
          const capped = element.value.length >= node.chooseN;
          element.querySelectorAll("input[type=checkbox]:not(:checked)").forEach(n => n.disabled = capped);
        });
      },
    });
    if (!result) return;

    for (const { value: uuid } of options) {
      this.selectItem(advancementUuid, uuid, result.itemUuids.includes(uuid));
    }

    this.render({ parts: ["chains"] });
  }
}
