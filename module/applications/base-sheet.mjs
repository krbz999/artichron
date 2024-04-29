/**
 * Sheet class mixin to add common functions shared by all types of sheets.
 * @param {*} Base      The base class.
 * @returns {*}         Extended class.
 */
export const ArtichronSheetMixin = Base => class extends Base {
  static SHEET_MODES = {EDIT: 0, PLAY: 1};

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.dragDrop = [{dragSelector: ".item-name"}];
    return options;
  }

  /** @override */
  _onDragStart(event) {
    const entry = this._getEntryFromEvent(event);
    const data = entry.toDragData();
    event.dataTransfer.setData("text/plain", JSON.stringify(data));
  }

  /**
   * Get the item or effect from this document's collection, or from an embedded document.
   * @param {Event} event
   * @returns {ItemArtichron|ActiveEffectArtichron}
   */
  _getEntryFromEvent(event) {
    const embeddedName = event.currentTarget.closest("[data-collection]").dataset.collection;
    const data = event.currentTarget.closest("[data-item-id]").dataset;
    const parent = data.parentId ? this.document.items.get(data.parentId) : this.document;
    return parent.getEmbeddedCollection(embeddedName).get(data.itemId);
  }

  /**
   * The current sheet mode.
   * @type {number}
   */
  _sheetMode = this.constructor.SHEET_MODES.PLAY;

  /** @override */
  getData() {
    const types = Object.keys(game.system.documentTypes[this.document.documentName]);
    const data = {
      rollData: this.document.getRollData(),
      document: this.document,
      system: this.document.system,
      source: this.document.system.toObject(),
      config: CONFIG.SYSTEM,
      sheet: this,
      isEditMode: this.isEditMode
    };
    types.forEach(type => data[`is${type.capitalize()}`] = this.document.type === type);
    return data;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html = html[0];
    html.querySelectorAll("[type=text], [type=number]").forEach(n => {
      if (n.classList.contains("delta")) n.addEventListener("change", this._onChangeDelta.bind(this));
      n.addEventListener("focus", event => event.currentTarget.select());
    });

    const {left, top} = this.position ?? {};
    this.setPosition({left, top, height: "auto"});
    this._disableOverriddenFields(html);
  }

  /**
   * Disable any input fields that are affected by an ActiveEffect.
   * @param {HTMLElement} html
   */
  _disableOverriddenFields(html) {
    const names = Object.keys(foundry.utils.flattenObject(this.document.overrides));
    for (const name of names) {
      html.querySelectorAll(`[name="${name}"]`).forEach(k => {
        if (!k.classList.contains("source")) {
          k.disabled = true;
          k.dataset.tooltip = "ARTICHRON.Warning.FieldOverridden";
        }
      });
    }
  }

  /**
   * Allow for deltas in input fields.
   * @param {PointerEvent} event      The initiating change event.
   */
  _onChangeDelta(event) {
    const target = event.currentTarget;
    if (!target.value) {
      target.value = null;
      return;
    }
    const prop = foundry.utils.getProperty(this.document, target.name);
    const max = Number.isNumeric(target.max) ? Number(target.max) : null;

    let value = target.value;
    if (/^[+-][0-9]+/.test(value)) value = Roll.safeEval(`${prop} ${value}`);
    if (max !== null) value = Math.min(max, value);
    target.value = value;
  }

  /** @override */
  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    buttons.unshift({
      label: "ARTICHRON.Opacity",
      class: "opacity",
      icon: "fa-solid",
      onclick: this._onToggleOpacity.bind(this)
    }, {
      label: "ARTICHRON.SheetMode",
      class: "sheet-mode",
      icon: "fa-solid",
      onclick: this._onToggleSheetMode.bind(this)
    });
    return buttons;
  }

  /**
   * Toggle the opacity class on this application.
   * @param {PointerEvent} event
   */
  _onToggleOpacity(event) {
    event.currentTarget.closest(".app").classList.toggle("opacity");
  }

  /** Toggle the sheet mode between edit and play. */
  _onToggleSheetMode() {
    const modes = this.constructor.SHEET_MODES;
    this._sheetMode = this.isEditMode ? modes.PLAY : modes.EDIT;
    this.render();
  }

  get isPlayMode() {
    return this._sheetMode === this.constructor.SHEET_MODES.PLAY;
  }
  get isEditMode() {
    return this._sheetMode === this.constructor.SHEET_MODES.EDIT;
  }

  /** @override */
  async _renderOuter() {
    const html = await super._renderOuter();
    const header = html[0].querySelector(".window-header");
    header.querySelectorAll(".header-button").forEach(btn => {
      const label = btn.querySelector(":scope > i").nextSibling;
      btn.dataset.tooltip = label.textContent;
      btn.setAttribute("aria-label", label.textContent);
      label.remove();
    });
    return html;
  }

  /** @override */
  _onToggleMinimize(event) {
    if (event.target.closest(".header-button.control, .document-id-link")) return;
    return super._onToggleMinimize(event);
  }

  /** @override */
  _onChangeTab(event, tabs, active) {
    this.setPosition({height: "auto"});
  }
};
