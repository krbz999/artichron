import ArtichronApplicationMixin from "./artichron-application-mixin.mjs";

/**
 * Sheet class mixin to add common functions shared by all types of sheets.
 * Feature set:
 * - Play/Edit mode toggle.
 * - Automatically selecting full contents of `INPUT.delta` elements.
 * - Allowing for deltas to be entered in `INPUT.delta` elements.
 * - Intended primarily for actor/item sheets, the base assumption is that this has no submit button but submits on change.
 * - Preparing basic context relevant to documents.
 * - Utility methods for handling embedded documents.
 * - Utility methods for handling embedded pseudo-documents.
 * @template {Function} DocumentSheet
 * @param {DocumentSheet} Class
 */
export default function DocumentSheetMixin(Class) {
  return class DocumentSheetArtichron extends ArtichronApplicationMixin(Class) {
    /**
     * Different sheet modes.
     * @enum {number}
     */
    static SHEET_MODES = { EDIT: 0, PLAY: 1 };

    /* -------------------------------------------------- */

    /** @inheritdoc */
    static DEFAULT_OPTIONS = {
      form: { submitOnChange: true },
      actions: {
        toggleSheet: DocumentSheetArtichron.#onToggleSheet,
        createEmbeddedDocument: DocumentSheetArtichron.#createEmbeddedDocument,
        renderEmbeddedDocumentSheet: DocumentSheetArtichron.#renderEmbeddedDocumentSheet,
        createPseudoDocument: DocumentSheetArtichron.#createPseudoDocument,
        deletePseudoDocument: DocumentSheetArtichron.#deletePseudoDocument,
        renderPseudoDocumentSheet: DocumentSheetArtichron.#renderPseudoDocumentSheet,
      },
    };

    /* -------------------------------------------------- */

    /**
     * The current sheet mode.
     * @type {number}
     */
    _sheetMode = this.constructor.SHEET_MODES.PLAY;

    /* -------------------------------------------------- */

    /**
     * Is the sheet currently in 'Play' mode?
     * @type {boolean}
     */
    get isPlayMode() {
      return this._sheetMode === this.constructor.SHEET_MODES.PLAY;
    }

    /* -------------------------------------------------- */

    /**
     * Is the sheet currently in 'Edit' mode?
     * @type {boolean}
     */
    get isEditMode() {
      return this._sheetMode === this.constructor.SHEET_MODES.EDIT;
    }

    /* -------------------------------------------------- */

    /**
     * A set of uuids of embedded documents whose descriptions have been expanded on this sheet.
     * @type {Set<string>}
     */
    _expandedItems = new Set();

    /* -------------------------------------------------- */

    /** @inheritdoc */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);

      Object.assign(context, {
        isPlayMode: this.isPlayMode,
        isEditMode: this.isEditMode,
      });

      if (this.document.system instanceof foundry.abstract.TypeDataModel) {
        context.systemFields = this.document.system.schema.fields;
      }

      return context;
    }

    /* -------------------------------------------------- */

    /**
     * Prepare effects for rendering.
     * @returns {object[]}
     */
    async _prepareEffects() {
      const effects = [];

      const entry = async (effect) => {
        const data = {
          effect: effect,
          isExpanded: this._expandedItems.has(effect.uuid),

          isActiveFusion: effect.isActiveFusion,
          isFusionOption: effect.isTransferrableFusion,
          isCondition: effect.type === "condition",
        };
        if (data.isExpanded) {
          data.enrichedText = await foundry.applications.ux.TextEditor.implementation.enrichHTML(effect.description, {
            relativeTo: effect, rollData: effect.getRollData(),
          });
        }
        effects.push(data);
      };

      if (this.document instanceof Item) for (const e of this.document.effects) await entry(e);
      else for (const e of this.document.allApplicableEffects()) await entry(e);

      effects.sort((a, b) => {
        const sort = a.effect.sort - b.effect.sort;
        if (sort) return sort;
        return a.effect.name.localeCompare(b.effect.name);
      });
      return effects;
    }

    /* -------------------------------------------------- */

    /** @inheritdoc */
    async _onRender(context, options) {
      await super._onRender(context, options);

      if (!this.isEditable) return;

      // INPUT.delta elements select their contents when focused and have deltas parsed.
      for (const input of this.element.querySelectorAll("input.delta")) {
        input.addEventListener("focus", () => input.select());
        if (input.name) {
          input.addEventListener("change", () => artichron.utils.parseInputDelta(input, this.document));
        }
      }

      for (const input of this.element.querySelectorAll("[data-change=updateEmbedded]")) {
        input.addEventListener("change", DocumentSheetArtichron.#updateEmbedded.bind(this));
      }
    }

    /* -------------------------------------------------- */

    /** @inheritdoc */
    _syncPartState(partId, newElement, priorElement, state) {
      super._syncPartState(partId, newElement, priorElement, state);

      // Refocus on a delta.
      const focus = newElement.querySelector(":focus");
      if (focus && focus.classList.contains("delta")) focus.select();
    }

    /* -------------------------------------------------- */

    /** @inheritdoc */
    async _renderFrame(options) {
      const frame = await super._renderFrame(options);
      this.window.controls.insertAdjacentHTML("afterend", `
        <button type="button" class="header-control icon fa-solid fa-user-lock" data-action="toggleSheet" data-tooltip="ARTICHRON.SHEET.TOGGLE.editing"></button>`);
      return frame;
    }

    /* -------------------------------------------------- */
    /*   Event handlers                                   */
    /* -------------------------------------------------- */

    /**
     * Handle toggling between Edit and Play mode.
     * @this {DocumentSheetArtichron}
     * @param {PointerEvent} event    The initiating click event.
     * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
     */
    static #onToggleSheet(event, target) {
      const modes = this.constructor.SHEET_MODES;
      this._sheetMode = this.isEditMode ? modes.PLAY : modes.EDIT;
      this.render();
    }

    /* -------------------------------------------------- */

    /**
     * Helper method to retrieve an embedded document (possibly a grandchild).
     * @param {HTMLElement} element   An element able to find [data-id] and optionally [data-parent-id].
     * @returns {foundry.abstract.Document}   The embedded document.
     */
    _getEmbeddedDocument(element) {
      let embedded;
      const { parentId, id } = element.closest("[data-id]")?.dataset ?? {};
      if (parentId) {
        embedded = this.document.items.get(parentId).effects.get(id);
      } else {
        embedded = this.document.getEmbeddedCollection(element.closest("[data-document-name]").dataset.documentName).get(id);
      }
      return embedded;
    }

    /* -------------------------------------------------- */

    /**
     * Helper method to retrieve an embedded pseudo-document.
     * @param {HTMLElement} element   The element with relevant data.
     * @returns {artichron.data.pseudoDocuments.PseudoDocument}
     */
    _getPseudoDocument(element) {
      const documentName = element.closest("[data-pseudo-document-name]").dataset.pseudoDocumentName;
      const id = element.closest("[data-pseudo-id]").dataset.pseudoId;
      return this.document.getEmbeddedDocument(documentName, id);
    }

    /* -------------------------------------------------- */

    /**
     * Handle click events to create an item.
     * @this {DocumentSheetArtichron}
     * @param {PointerEvent} event    The initiating click event.
     * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
     */
    static #createEmbeddedDocument(event, target) {
      const documentName = target.closest("[data-document-name]").dataset.documentName;
      const type = target.closest("[data-type]")?.dataset.type;
      const Cls = foundry.utils.getDocumentClass(documentName);
      const context = { parent: this.document, renderSheet: true };

      if (type) {
        Cls.create({
          type,
          name: Cls.defaultName({ type, parent: this.document }),
        }, context);
      } else {
        Cls.createDialog({}, context, { types: undefined });
      }
    }

    /* -------------------------------------------------- */

    /**
     * Handle click events to render an item's sheet.
     * @this {DocumentSheetArtichron}
     * @param {PointerEvent} event    The initiating click event.
     * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
     */
    static async #renderEmbeddedDocumentSheet(event, target) {
      this._getEmbeddedDocument(target).sheet.render({ force: true });
    }

    /* -------------------------------------------------- */

    /**
     * Handle the change events on input fields that should propagate to the embedded document.
     * @this {DocumentSheetArtichron}
     * @param {PointerEvent} event    The initiating change event.
     */
    static #updateEmbedded(event) {
      const target = event.currentTarget;
      const property = target.dataset.property;
      const item = this._getEmbeddedDocument(target);
      const result = artichron.utils.parseInputDelta(target, item);
      if (result !== undefined) {
        if (property === "system.usage.value") {
          item.update(item.system._usageUpdate(result, false));
        } else item.update({ [property]: result });
      }
    }

    /* -------------------------------------------------- */

    /**
     * Create a pseudo-document.
     * @this {ItemSheetArtichron}
     * @param {PointerEvent} event    The initiating click event.
     * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
     */
    static #createPseudoDocument(event, target) {
      const documentName = target.closest("[data-pseudo-document-name]").dataset.pseudoDocumentName;
      const type = target.closest("[data-pseudo-type]")?.dataset.pseudoType;
      const Cls = this.document.getEmbeddedPseudoDocumentCollection(documentName).documentClass;

      if (!type && (foundry.utils.isSubclass(Cls, artichron.data.pseudoDocuments.TypedPseudoDocument))) {
        Cls.createDialog({}, { parent: this.document });
      } else {
        Cls.create({ type }, { parent: this.document });
      }
    }

    /* -------------------------------------------------- */

    /**
     * Delete a pseudo-document.
     * @this {ItemSheetArtichron}
     * @param {PointerEvent} event    The initiating click event.
     * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
     */
    static #deletePseudoDocument(event, target) {
      const doc = this._getPseudoDocument(target);
      doc.delete();
    }

    /* -------------------------------------------------- */

    /**
     * Render the sheet of a pseudo-document.
     * @this {ItemSheetArtichron}
     * @param {PointerEvent} event    The initiating click event.
     * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
     */
    static #renderPseudoDocumentSheet(event, target) {
      const doc = this._getPseudoDocument(target);
      doc.sheet.render({ force: true });
    }
  };
}
