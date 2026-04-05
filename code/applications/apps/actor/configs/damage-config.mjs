import DocumentConfig from "../../../api/document-config.mjs";

export default class DamageConfig extends DocumentConfig {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    window: {
      title: "ARTICHRON.ATTACK.CONFIG.TITLE",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "systems/artichron/templates/apps/actor/configs/damage-config/form.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @type {import("../../../../_types").ContextPartHandler} */
  async _preparePartContextForm(context, options) {
    const ctx = context.ctx = {};
    const damageTypes = artichron.config.DAMAGE_TYPES.optgroups;
    const attackTypes = artichron.config.BASIC_ATTACKS.optgroups;

    Object.assign(ctx, {
      damageTypes, attackTypes,
      damageParts: this.document.getEmbeddedPseudoDocumentCollection("Damage").sourceContents.map(part => {
        return { document: part, classes: ["draggable"] };
      }),
    });

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);

    // Add context menu for damage parts.
    this._createContextMenu(
      this.#getContextOptionsDamagePart,
      ".document-list.damage .entry",
      { hookName: "DamagePartEntryContext" },
    );
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    new foundry.applications.ux.DragDrop.implementation({
      dragSelector: ".draggable",
      permissions: {
        dragstart: () => true,
        drop: () => this.isEditable,
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        drop: this._onDrop.bind(this),
      },
    }).bind(this.element);
  }

  /* -------------------------------------------------- */

  /**
   * Prepare options for context menus for damage parts.
   * @returns {object[]}
   */
  #getContextOptionsDamagePart() {
    if (!this.document.isOwner) return [];

    return [{
      name: "ARTICHRON.DAMAGE.CONTEXT.PART.render",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      callback: element => this._getPseudoDocument(element).sheet.render({ force: true }),
    }, {
      name: "ARTICHRON.DAMAGE.CONTEXT.PART.delete",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      callback: element => this._getPseudoDocument(element).delete(),
    }];
  }

  /* -------------------------------------------------- */
  /*   Drag and Drop                                    */
  /* -------------------------------------------------- */

  /**
   * An event that occurs when a drag workflow begins for a draggable damage part.
   * @param {DragEvent} event   The initiating drag start event.
   * @returns {Promise<void>}
   */
  async _onDragStart(event) {
    const document = this._getPseudoDocument(event.target);
    event.dataTransfer.setData("text/plain", JSON.stringify(document.toDragData()));
  }

  /* -------------------------------------------------- */

  /**
   * An event that occurs when data is dropped into a drop target.
   * @param {DragEvent} event
   * @returns {Promise<void>}
   */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    const allowed = Hooks.call("dropActorSheetData", this.document, this, data);
    if (allowed === false) return;

    // Dropped pseudo-documents.
    const document = await fromUuid(data.uuid);
    if (document?.documentName === "Damage") await this.document.sheet._onDropPseudoDocument(event, document);
  }
}
