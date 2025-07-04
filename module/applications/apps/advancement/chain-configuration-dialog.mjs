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
      configureAdvancement: ChainConfigurationDialog.#configureAdvancement,
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

  /**
   * Find the node that contains an advancement.
   * @param {string} uuid   The uuid of an advancement.
   * @returns {AdvancementChain|null}
   */
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
    // This application has no return value other than us needing to know whether it was dismissed or not.
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
  static async #configureAdvancement(event, target) {
    const advancementUuid = target.closest("[data-advancement-uuid]").dataset.advancementUuid;
    const node = this.getByAdvancement(advancementUuid);
    const configured = await node.advancement.configureAdvancement(node);
    if (!configured) return;
    this.render();
  }
}
