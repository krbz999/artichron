/**
 * @typedef {object} TabConfiguration
 * @property {string} id        The unique key for this tab.
 * @property {string} group     The group that this tab belongs to.
 * @property {string} label     The displayed label for this tab.
 */

/**
 * Sheet class mixin to add common functions shared by all types of sheets.
 * @param {*} Base      The base class.
 * @returns {*}         Extended class.
 */
export const ArtichronSheetMixin = Base => {
  const mixin = foundry.applications.api.HandlebarsApplicationMixin;
  return class DocumentSheetArtichron extends mixin(Base) {

    static SHEET_MODES = {EDIT: 0, PLAY: 1};

    /** @override */
    static DEFAULT_OPTIONS = {
      form: {submitOnChange: true},
      window: {
        contentClasses: [],
        controls: [{
          action: "toggleSheetMode",
          label: "ARTICHRON.HeaderControl.SheetMode",
          icon: "fa-solid fa-otter"
        }, {
          action: "toggleOpacity",
          label: "ARTICHRON.HeaderControl.Opacity",
          icon: "fa-solid fa-otter"
        }]
      },
      actions: {
        editImage: this._onEditImage,
        toggleSheetMode: this._onToggleSheetMode,
        toggleOpacity: this._ontoggleOpacity,
        toggleEffect: this._onToggleEffect,
        editEffect: this._onEditEffect,
        deleteEffect: this._onDeleteEffect,
        createEffect: this._onCreateEffect
      }
    };

    /**
     * The current sheet mode.
     * @type {number}
     */
    _sheetMode = this.constructor.SHEET_MODES.PLAY;

    get isPlayMode() {
      return this._sheetMode === this.constructor.SHEET_MODES.PLAY;
    }
    get isEditMode() {
      return this._sheetMode === this.constructor.SHEET_MODES.EDIT;
    }

    /** @override */
    tabGroups = {};

    /**
     * Tabs that are present on this sheet.
     * @enum {TabConfiguration}
     */
    static TABS = {};

    /**
     * Utility method for _prepareContext to create the tab navigation.
     * @returns {object}
     */
    _getTabs() {
      return Object.values(this.constructor.TABS).reduce((acc, v) => {
        const isActive = this.tabGroups[v.group] === v.id;
        acc[v.id] = {
          ...v,
          active: isActive,
          cssClass: isActive ? "item active" : "item",
          tabCssClass: isActive ? "tab scrollable active" : "tab scrollable"
        };
        return acc;
      }, {});
    }

    /** @override */
    _renderHeaderControl(control) {
      // Core does not localize header buttons.
      control = {...control};
      control.label = game.i18n.localize(control.label);
      return super._renderHeaderControl(control);
    }

    /**
     * Prepare effects for rendering.
     * @returns {object[]}
     */
    _prepareEffects() {
      const effects = [];

      const entry = effect => {
        effects.push({
          uuid: effect.uuid,
          img: effect.img,
          name: effect.name,
          source: effect.parent.name,
          isFusion: effect.type === "fusion",
          disabled: effect.disabled
        });
      };

      if (this.document instanceof Item) for (const e of this.document.effects) entry(e);
      else for (const e of this.document.allApplicableEffects()) entry(e);

      effects.sort((a, b) => a.name.localeCompare(b.name));
      return effects;
    }

    /** @override */
    _onRender(context, options) {
      super._onRender(context, options);
      this.element.querySelectorAll("input.delta").forEach(n => {
        n.addEventListener("focus", event => event.currentTarget.select());
        if (n.name) n.addEventListener("change", event => {
          artichron.utils.parseInputDelta(event.currentTarget, this.document);
        });
      });
    }

    /** @override */
    _syncPartState(partId, newElement, priorElement, state) {
      super._syncPartState(partId, newElement, priorElement, state);
      const focus = newElement.querySelector(":focus");
      if (focus && focus.classList.contains("delta")) focus.select();
    }

    /* -------------------------------------------- */
    /*                EVENT HANDLERS                */
    /* -------------------------------------------- */

    static _onEditImage(event, target) {
      const current = this.document.img;
      const fp = new FilePicker({
        type: "image",
        current: current,
        callback: path => this.document.update({img: path}),
        top: this.position.top + 40,
        left: this.position.left + 10
      });
      return fp.browse();
    }
    static _ontoggleOpacity(event, target) {
      target.closest(".application").classList.toggle("opacity");
    }
    static _onToggleSheetMode(event) {
      const modes = this.constructor.SHEET_MODES;
      this._sheetMode = this.isEditMode ? modes.PLAY : modes.EDIT;
      this.render();
    }

    /** ActiveEffect event handlers. */
    static async _onToggleEffect(event, target) {
      const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
      const effect = await fromUuid(uuid);
      effect.update({disabled: !effect.disabled});
    }
    static async _onEditEffect(event, target) {
      const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
      const effect = await fromUuid(uuid);
      effect.sheet.render(true);
    }
    static async _onDeleteEffect(event, target) {
      const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
      const effect = await fromUuid(uuid);
      effect.deleteDialog();
    }
    static _onCreateEffect(event, target) {
      getDocumentClass("ActiveEffect").createDialog({
        type: "fusion", img: "icons/svg/sun.svg"
      }, {parent: this.document});
    }
  };
};
