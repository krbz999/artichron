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
   * Helper method for creating field data.
   * @param {object} context      Current rendering context.
   * @param {string} path         Path in the clock schema.
   * @returns {object}            Field data.
   */
  #prepareField(context, path) {
    return {
      field: context.clock.schema.getField(path),
      value: context.clock[path] || null,
      source: context.clock._source[path],
    };
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for Identity tab.
   * @param {object} context      Rendering context. **will be mutated**
   * @param {object} options      Rendering options.
   */
  async #prepareIdentityContext(context, options) {
    Object.assign(context, {
      name: {
        ...this.#prepareField(context, "name"),
        placeholder: game.i18n.localize(context.clock.constructor.metadata.defaultName),
      },
      color: {
        ...this.#prepareField(context, "color"),
        placeholder: context.clock.constructor.metadata.color,
      },
    });
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for Details tab.
   * @param {object} context      Rendering context. **will be mutated**
   * @param {object} options      Rendering options.
   */
  async #prepareDetailsContext(context, options) {
    Object.assign(context, {
      value: {
        ...this.#prepareField(context, "value"),
        placeholder: "0",
      },
      max: {
        ...this.#prepareField(context, "max"),
        placeholder: "8",
      },
      description: {
        ...this.#prepareField(context, "description"),
        enriched: await foundry.applications.ux.TextEditor.enrichHTML(context.clock.description),
      },
    });
  }
}
