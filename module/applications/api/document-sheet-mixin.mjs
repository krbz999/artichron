/**
 * @typedef {object} TabConfiguration
 * @property {string} id        The unique key for this tab.
 * @property {string} group     The group that this tab belongs to.
 * @property {string} label     The displayed label for this tab.
 */

/**
 * Sheet class mixin to add common functions shared by all types of sheets.
 * @param {*} Base                        The base class.
 * @returns {DocumentSheetArtichron}      Extended class.
 */
const ArtichronDocumentSheetMixin = Base => {
  const mixin = foundry.applications.api.HandlebarsApplicationMixin;
  return class DocumentSheetArtichron extends mixin(Base) {
    /**
     * Different sheet modes.
     * @enum {number}
     */
    static SHEET_MODES = { EDIT: 0, PLAY: 1 };

    /* -------------------------------------------------- */

    /** @inheritdoc */
    static DEFAULT_OPTIONS = {
      classes: ["artichron"],
      window: { contentClasses: ["standard-form"] },
      form: { submitOnChange: true },
      actions: {
        createEffect: DocumentSheetArtichron.#onCreateEffect,
        deleteEffect: DocumentSheetArtichron.#onDeleteEffect,
        editEffect: DocumentSheetArtichron.#onEditEffect,
        // editImage: DocumentSheetArtichron.#onEditImage,
        toggleDescription: DocumentSheetArtichron.#onToggleDescription,
        toggleEffect: DocumentSheetArtichron.#onToggleEffect,
        toggleOpacity: DocumentSheetArtichron.#ontoggleOpacity,
        toggleSheet: DocumentSheetArtichron.#onToggleSheet,
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

    /**
     * Convenience method for preparing a document's description for direct insertion.
     * @param {HTMLElement} target      The containing element.
     * @param {string} uuid             The uuid of the document.
     */
    async #insertDocumentDescription(target, uuid) {
      const wrapper = target.querySelector(".description-wrapper");
      if (wrapper.querySelector(".description")) return;
      const item = await fromUuid(uuid);
      const path = (item.documentName === "ActiveEffect") ? "description" : "system.description.value";
      const description = foundry.utils.getProperty(item, path);
      const text = await foundry.applications.ux.TextEditor.enrichHTML(description, {
        relativeTo: item, rollData: item.getRollData(),
      });
      if (wrapper.querySelector(".description")) return;
      const div = document.createElement("DIV");
      div.classList.add("description");
      div.innerHTML = text;
      wrapper.replaceChildren(div);
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
          data.enrichedText = await foundry.applications.ux.TextEditor.enrichHTML(effect.description, {
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
    async _onFirstRender(context, options) {
      await super._onFirstRender(context, options);
      this._setupContextMenu(this._getActiveEffectEntryContextOptions, "effect-entry", "ActiveEffectEntryContext");
      this._setupContextMenu(this._getItemEntryContextOptions, "inventory-item", "ItemEntryContext");
    }

    /* -------------------------------------------------- */

    /** @inheritdoc */
    async _onRender(context, options) {
      await super._onRender(context, options);

      if (this.isEditable) {
        this.element.querySelectorAll("input.delta").forEach(n => {
          n.addEventListener("focus", event => event.currentTarget.select());
          if (n.name) n.addEventListener("change", event => {
            artichron.utils.parseInputDelta(event.currentTarget, this.document);
          });
        });
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
    _prepareTabs(group) {
      const tabs = super._prepareTabs(group);
      for (const k of Object.keys(tabs)) {
        const ignored = this.constructor.PARTS[k]?.types?.[this.document.type] === false;
        if (ignored) delete tabs[k];
      }
      return tabs;
    }

    /* -------------------------------------------------- */

    /** @inheritdoc */
    _configureRenderParts(options) {
      const parts = super._configureRenderParts(options);
      for (const [k, v] of Object.entries(parts)) {
        const ignored = v.types?.[this.document.type] === false;
        if (ignored) delete parts[k];
      }
      return parts;
    }

    /* -------------------------------------------------- */

    /** @inheritdoc */
    async _renderFrame(options) {
      const frame = await super._renderFrame(options);
      this.window.controls.insertAdjacentHTML("afterend", `
        <button type="button" class="header-control icon fa-solid fa-user-lock" data-action="toggleSheet" data-tooltip="ARTICHRON.SHEET.TOGGLE.editing"></button>
        <button type="button" class="header-control icon fa-solid" data-action="toggleOpacity" data-tooltip="ARTICHRON.SHEET.TOGGLE.opacity"></button>`);

      return frame;
    }

    /* -------------------------------------------------- */
    /*   Context menu handlers                            */
    /* -------------------------------------------------- */

    /**
     * Bind a new context menu.
     */
    _setupContextMenu(handler, selector, hookName, options = {}) {
      this._createContextMenu(handler, selector, { hookName, ...options });
    }

    /* -------------------------------------------------- */

    /** @inheritdoc */
    _createContextMenu(handler, selector, { hookName, ...options } = {}) {
      const menuItems = this._doEvent(handler, { hookName, parentClassHooks: false, hookResponse: true });
      if (!menuItems.length) return null;
      return new artichron.applications.ui.ContextMenu(this.element, selector, menuItems, {
        jQuery: false, fixed: true, ...options,
      });
    }

    /* -------------------------------------------------- */

    /**
     * Create context menu options for active effects.
     * @returns {ContextMenuEntry[]}
     */
    _getActiveEffectEntryContextOptions() {
      return [{
        name: "ARTICHRON.ContextMenu.ActiveEffect.Render",
        icon: "<i class='fa-solid fa-fw fa-edit'></i>",
        condition: element => element.item.isOwner,
        callback: element => element.item.sheet.render({ force: true }),
        group: "manage",
      }, {
        name: "ARTICHRON.ContextMenu.ActiveEffect.Delete",
        icon: "<i class='fa-solid fa-fw fa-trash'></i>",
        condition: element => element.item.isOwner && !element.item.isActiveFusion,
        callback: element => element.item.deleteDialog(),
        group: "manage",
      }, {
        name: "ARTICHRON.ContextMenu.ActiveEffect.Enable",
        icon: "<i class='fa-solid fa-fw fa-toggle-on'></i>",
        condition: element => element.item.isOwner && element.item.disabled,
        callback: element => element.item.update({ disabled: false }),
        group: "action",
      }, {
        name: "ARTICHRON.ContextMenu.ActiveEffect.Disable",
        icon: "<i class='fa-solid fa-fw fa-toggle-off'></i>",
        condition: element => element.item.isOwner && !element.item.disabled && (element.item.type !== "fusion"),
        callback: element => element.item.update({ disabled: true }),
        group: "action",
      }, {
        name: "ARTICHRON.ContextMenu.ActiveEffect.Duplicate",
        icon: "<i class='fa-solid fa-fw fa-copy'></i>",
        condition: element => element.item.isOwner && (element.item.type !== "condition") && !element.item.isActiveFusion,
        callback: element => {
          const item = element.item;
          item.clone({
            name: game.i18n.format("DOCUMENT.CopyOf", { name: item._source.name }),
          }, { save: true, addSource: true });
        },
        group: "action",
      }, {
        name: "ARTICHRON.ContextMenu.ActiveEffect.Unfuse",
        icon: "<i class='fa-solid fa-fw fa-volcano'></i>",
        condition: element => element.item.isOwner && element.item.isActiveFusion,
        callback: element => element.item.unfuseDialog(),
        group: "action",
      }, {
        name: "ARTICHRON.ContextMenu.ActiveEffect.IncreaseLevel",
        icon: "<i class='fa-solid fa-fw fa-circle-arrow-up'></i>",
        condition: element => {
          const e = element.item;
          return e.isOwner &&
            (e.type === "condition") &&
            Number.isInteger(e.system.level) &&
            (artichron.config.STATUS_CONDITIONS[e.system.primary].levels > e.system.level);
        },
        callback: element => element.item.system.increase(),
        group: "action",
      }, {
        name: "ARTICHRON.ContextMenu.ActiveEffect.DecreaseLevel",
        icon: "<i class='fa-solid fa-fw fa-circle-arrow-down'></i>",
        condition: element => {
          const e = element.item;
          return e.isOwner &&
            (e.type === "condition") &&
            Number.isInteger(e.system.level) && (e.system.level > 0);
        },
        callback: element => element.item.system.decrease(),
        group: "action",
      }];
    }

    /* -------------------------------------------------- */

    /**
     * Create context menu options for items.
     * @returns {ContextMenuEntry[]}
     */
    _getItemEntryContextOptions() {
      return [{
        name: "ARTICHRON.ContextMenu.Item.Render",
        icon: "<i class='fa-solid fa-fw fa-edit'></i>",
        condition: element => element.item.isOwner,
        callback: element => element.item.sheet.render({ force: true }),
        group: "manage",
      }, {
        name: "ARTICHRON.ContextMenu.Item.Delete",
        icon: "<i class='fa-solid fa-fw fa-trash'></i>",
        condition: element => element.item.isOwner && !element.item.isEquipped,
        callback: element => element.item.deleteDialog(),
        group: "manage",
      }, {
        name: "ARTICHRON.ContextMenu.Item.Equip",
        icon: "<i class='fa-solid fa-fw fa-shield'></i>",
        condition: element => element.item.isOwner && element.item.system.canEquip,
        callback: element => element.item.system.equip(),
        group: "action",
      }, {
        name: "ARTICHRON.ContextMenu.Item.Unequip",
        icon: "<i class='fa-solid fa-fw fa-shield-halved'></i>",
        condition: element => ["hero", "monster"].includes(element.item.actor.type) && element.item.isOwner && element.item.isEquipped,
        callback: element => element.item.system.unequip(),
        group: "action",
      }, {
        name: "ARTICHRON.ContextMenu.Item.Favorite",
        icon: "<i class='fa-solid fa-fw fa-star'></i>",
        condition: element => ["hero", "monster"].includes(element.item.actor.type) && element.item.isOwner && !element.item.isFavorite,
        callback: element => element.item.actor.addFavoriteItem(element.item.id),
        group: "action",
      }, {
        name: "ARTICHRON.ContextMenu.Item.Unfavorite",
        icon: "<i class='fa-regular fa-fw fa-star'></i>",
        condition: element => ["hero", "monster"].includes(element.item.actor.type) && element.item.isOwner && element.item.isFavorite,
        callback: element => element.item.actor.removeFavoriteItem(element.item.id),
        group: "action",
      }, {
        name: "ARTICHRON.ContextMenu.Item.Use",
        icon: "<i class='fa-solid fa-fw fa-hand-fist'></i>",
        condition: element => ["hero", "monster"].includes(element.item.actor.type) && element.item.isOwner && (element.item.isEquipped || (!element.item.isArsenal && !element.item.isArmor)),
        callback: element => element.item.use(),
        group: "action",
      }, {
        name: "ARTICHRON.ContextMenu.Item.Fuse",
        icon: "<i class='fa-solid fa-fw fa-volcano'></i>",
        condition: element => ["hero", "monster"].includes(element.item.actor.type) && element.item.isOwner && element.item.hasFusions && !element.item.isFused,
        callback: element => element.item.fuseDialog(),
        group: "action",
      }, {
        name: "ARTICHRON.ContextMenu.Item.Unfuse",
        icon: "<i class='fa-solid fa-fw fa-recycle'></i>",
        condition: element => ["hero", "monster"].includes(element.item.actor.type) && element.item.isOwner && element.item.isFused,
        callback: element => element.item.system.fusion.unfuseDialog(),
        group: "action",
      }];
    }

    /* -------------------------------------------------- */
    /*   Event handlers                                   */
    /* -------------------------------------------------- */

    /**
     * Handle toggling the Opacity lock of the sheet.
     * @this {DocumentSheetArtichron}
     * @param {PointerEvent} event      The originating click event.
     * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
     */
    static #ontoggleOpacity(event, target) {
      target.closest(".application").classList.toggle("opacity");
    }

    /* -------------------------------------------------- */

    /**
     * Handle toggling between Edit and Play mode.
     * @this {DocumentSheetArtichron}
     * @param {PointerEvent} event      The originating click event.
     * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
     */
    static #onToggleSheet(event, target) {
      const modes = this.constructor.SHEET_MODES;
      this._sheetMode = this.isEditMode ? modes.PLAY : modes.EDIT;
      this.render();
    }

    /* -------------------------------------------------- */

    /**
     * Handle toggling an active effect on or off.
     * @this {DocumentSheetArtichron}
     * @param {PointerEvent} event      The originating click event.
     * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
     */
    static async #onToggleEffect(event, target) {
      if (!this.isEditable) return;
      const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
      const effect = await fromUuid(uuid);
      effect.update({ disabled: !effect.disabled });
    }

    /* -------------------------------------------------- */

    /**
     * Handle click events to render an effect's sheet.
     * @this {DocumentSheetArtichron}
     * @param {PointerEvent} event      The originating click event.
     * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
     */
    static async #onEditEffect(event, target) {
      const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
      const effect = await fromUuid(uuid);
      effect.sheet.render(true);
    }

    /* -------------------------------------------------- */

    /**
     * Handle click events to delete an effect.
     * @this {DocumentSheetArtichron}
     * @param {PointerEvent} event      The originating click event.
     * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
     */
    static async #onDeleteEffect(event, target) {
      if (!this.isEditable) return;
      const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
      const effect = await fromUuid(uuid);
      effect.deleteDialog();
    }

    /* -------------------------------------------------- */

    /**
     * Handle click events to create an effect.
     * @this {DocumentSheetArtichron}
     * @param {PointerEvent} event      The originating click event.
     * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
     */
    static #onCreateEffect(event, target) {
      if (!this.isEditable) return;
      const type = target.dataset.type;
      foundry.utils.getDocumentClass("ActiveEffect").createDialog({
        img: "icons/svg/sun.svg",
      }, { parent: this.document }, { types: [type] });
    }

    /* -------------------------------------------------- */

    /**
     * Handle click events to toggle a document's description.
     * @this {DocumentSheetArtichron}
     * @param {PointerEvent} event      The originating click event.
     * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
     */
    static #onToggleDescription(event, target) {
      const item = target.closest("[data-item-uuid]");
      const expanded = item.classList.contains("expanded");
      item.classList.toggle("expanded", !expanded);
      item.classList.add("transitioning");
      const uuid = item.dataset.itemUuid;
      if (expanded) this._expandedItems.delete(uuid);
      else {
        this._expandedItems.add(uuid);
        this.#insertDocumentDescription(item, uuid);
      }
    }
  };
};

export default ArtichronDocumentSheetMixin;
