import PseudoDocumentSheet from "../../api/pseudo-document-sheet.mjs";

export default class ClockSheet extends PseudoDocumentSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["clock"],
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    ...super.PARTS,
    identity: {
      template: "systems/artichron/templates/actor/clocks/identity.hbs",
    },
    details: {
      template: "systems/artichron/templates/actor/clocks/details.hbs",
    },
  };

  /* -------------------------------------------------- */

  /**
   * The clock pseudo-document.
   * @type {Clock}
   */
  get clock() {
    return this.pseudoDocument;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    Object.assign(context, {
      clock: this.clock,
    });

    switch (partId) {
      case "identity":
        await this.#prepareIdentityContext(context, options);
        break;
      case "details":
        await this.#prepareDetailsContext(context, options);
        break;
    }
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for Identity tab.
   * @param {object} context      Rendering context. **will be mutated**
   * @param {object} options      Rendering options.
   */
  async #prepareIdentityContext(context, options) {
    context.name = Object.assign(this._prepareField("name"), {
      placeholder: game.i18n.localize(context.clock.constructor.metadata.defaultName),
    });
    context.color = Object.assign(this._prepareField("color"), {
      placeholder: context.clock.constructor.metadata.color,
    });
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for Details tab.
   * @param {object} context      Rendering context. **will be mutated**
   * @param {object} options      Rendering options.
   */
  async #prepareDetailsContext(context, options) {
    context.value = Object.assign(this._prepareField("value"), { placeholder: "0" });
    context.max = Object.assign(this._prepareField("max"), { placeholder: "8" });
    context.description = Object.assign(this._prepareField("description"), {
      enriched: await foundry.applications.ux.TextEditor.enrichHTML(context.clock._source.description),
    });
  }
}
