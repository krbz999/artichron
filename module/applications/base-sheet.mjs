/**
 * @typedef {object} TabConfiguration
 * @property {string} id        The unique key for this tab.
 * @property {string} group     The group that this tab belongs to.
 * @property {string} label     The displayed label for this tab.
 */

import ActiveEffectArtichron from "../documents/active-effect.mjs";
import ItemArtichron from "../documents/item.mjs";

/**
 * Sheet class mixin to add common functions shared by all types of sheets.
 * @param {*} Base                        The base class.
 * @returns {DocumentSheetArtichron}      Extended class.
 */
const ArtichronSheetMixin = Base => {
  const mixin = foundry.applications.api.HandlebarsApplicationMixin;
  return class DocumentSheetArtichron extends mixin(Base) {
    /**
     * Different sheet modes.
     * @enum {number}
     */
    static SHEET_MODES = {EDIT: 0, PLAY: 1};

    /* -------------------------------------------------- */

    /** @override */
    static DEFAULT_OPTIONS = {
      classes: ["artichron"],
      window: {contentClasses: ["standard-form"]},
      form: {submitOnChange: true},
      actions: {
        createEffect: DocumentSheetArtichron.#onCreateEffect,
        deleteEffect: DocumentSheetArtichron.#onDeleteEffect,
        editEffect: DocumentSheetArtichron.#onEditEffect,
        editImage: DocumentSheetArtichron.#onEditImage,
        toggleDescription: DocumentSheetArtichron.#onToggleDescription,
        toggleEffect: DocumentSheetArtichron.#onToggleEffect,
        toggleOpacity: DocumentSheetArtichron.#ontoggleOpacity,
        toggleSheet: DocumentSheetArtichron.#onToggleSheet
      }
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
      const text = await TextEditor.enrichHTML(description, {relativeTo: item, rollData: item.getRollData()});
      if (wrapper.querySelector(".description")) return;
      const div = document.createElement("DIV");
      div.classList.add("description");
      div.innerHTML = text;
      wrapper.replaceChildren(div);
    }

    /* -------------------------------------------------- */

    /** @override */
    tabGroups = {};

    /* -------------------------------------------------- */

    /**
     * Tabs that are present on this sheet.
     * @enum {TabConfiguration}
     */
    static TABS = {};

    /* -------------------------------------------------- */

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
          cssClass: [isActive ? "active" : null].filterJoin(" "),
          tabCssClass: ["tab", "scrollable", isActive ? "active" : null].filterJoin(" ")
        };
        return acc;
      }, {});
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
          isCondition: effect.type === "condition"
        };
        if (data.isExpanded) {
          data.enrichedText = await TextEditor.enrichHTML(effect.description, {
            relativeTo: effect, rollData: effect.getRollData()
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

    /** @override */
    _onFirstRender(context, options) {
      super._onFirstRender(context, options);
      this._setupContextMenu();
    }

    /* -------------------------------------------------- */

    /** @override */
    _onRender(context, options) {
      super._onRender(context, options);

      if (this.isEditable) {
        this.element.querySelectorAll("input.delta").forEach(n => {
          n.addEventListener("focus", event => event.currentTarget.select());
          if (n.name) n.addEventListener("change", event => {
            artichron.utils.parseInputDelta(event.currentTarget, this.document);
          });
        });
      }

      this._setupDragAndDrop();
    }

    /* -------------------------------------------------- */

    /** @override */
    _syncPartState(partId, newElement, priorElement, state) {
      super._syncPartState(partId, newElement, priorElement, state);

      // Refocus on a delta.
      const focus = newElement.querySelector(":focus");
      if (focus && focus.classList.contains("delta")) focus.select();
    }

    /* -------------------------------------------------- */
    /*   Context menu handlers                            */
    /* -------------------------------------------------- */

    /**
     * Bind a new context menu.
     */
    _setupContextMenu() {
      new artichron.applications.ContextMenuArtichron(this.element, "[data-item-uuid]", [], {onOpen: element => {
        const item = fromUuidSync(element.dataset.itemUuid);
        if (!item) return;
        if (item.documentName === "ActiveEffect") ui.context.menuItems = this._getEffectContextOptions(item);
        else if (item.documentName === "Item") ui.context.menuItems = this._getItemContextOptions(item);
      }});
    }

    /* -------------------------------------------------- */

    /**
     * Create context menu options for an active effect.
     * @param {ActiveEffectArtichron} item      The effect.
     * @returns {object[]}                      The array of options.
     */
    _getEffectContextOptions(item) {
      const isOwner = item.isOwner;
      return [{
        name: "ARTICHRON.ContextMenu.ActiveEffect.Render",
        icon: "<i class='fa-solid fa-fw fa-edit'></i>",
        condition: () => isOwner,
        callback: () => item.sheet.render(true),
        group: "manage"
      }, {
        name: "ARTICHRON.ContextMenu.ActiveEffect.Delete",
        icon: "<i class='fa-solid fa-fw fa-trash'></i>",
        condition: () => isOwner && !item.isActiveFusion,
        callback: () => item.deleteDialog(),
        group: "manage"
      }, {
        name: "ARTICHRON.ContextMenu.ActiveEffect.Enable",
        icon: "<i class='fa-solid fa-fw fa-toggle-on'></i>",
        condition: () => isOwner && item.disabled,
        callback: () => item.update({disabled: false}),
        group: "action"
      }, {
        name: "ARTICHRON.ContextMenu.ActiveEffect.Disable",
        icon: "<i class='fa-solid fa-fw fa-toggle-off'></i>",
        condition: () => isOwner && !item.disabled && (item.type !== "fusion"),
        callback: () => item.update({disabled: true}),
        group: "action"
      }, {
        name: "ARTICHRON.ContextMenu.ActiveEffect.Duplicate",
        icon: "<i class='fa-solid fa-fw fa-copy'></i>",
        condition: () => isOwner && (item.type !== "condition") && !item.isActiveFusion,
        callback: () => item.clone({}, {save: true}),
        group: "action"
      }, {
        name: "ARTICHRON.ContextMenu.ActiveEffect.Unfuse",
        icon: "<i class='fa-solid fa-fw fa-volcano'></i>",
        condition: () => isOwner && item.isActiveFusion,
        callback: () => item.unfuseDialog(),
        group: "action"
      }, {
        name: "ARTICHRON.ContextMenu.ActiveEffect.IncreaseLevel",
        icon: "<i class='fa-solid fa-fw fa-circle-arrow-up'></i>",
        condition: () => {
          return isOwner &&
            (item.type === "condition") &&
            Number.isInteger(item.system.level) &&
            (CONFIG.SYSTEM.STATUS_CONDITIONS[item.system.primary].levels > item.system.level);
        },
        callback: () => item.system.increase(),
        group: "action"
      }, {
        name: "ARTICHRON.ContextMenu.ActiveEffect.DecreaseLevel",
        icon: "<i class='fa-solid fa-fw fa-circle-arrow-down'></i>",
        condition: () => {
          return isOwner &&
            (item.type === "condition") &&
            Number.isInteger(item.system.level) && (item.system.level > 0);
        },
        callback: () => item.system.decrease(),
        group: "action"
      }];
    }

    /* -------------------------------------------------- */

    /**
     * Create context menu options for an item.
     * @param {ItemArtichron} item      The item.
     * @returns {object[]}              The array of options.
     */
    _getItemContextOptions(item) {
      const isOwner = item.isOwner;
      const canEquip = ["hero", "monster"].includes(item.actor.type);
      const isEquipped = item.isEquipped;
      return [{
        name: "ARTICHRON.ContextMenu.Item.Render",
        icon: "<i class='fa-solid fa-fw fa-edit'></i>",
        condition: () => isOwner,
        callback: () => item.sheet.render(true),
        group: "manage"
      }, {
        name: "ARTICHRON.ContextMenu.Item.Delete",
        icon: "<i class='fa-solid fa-fw fa-trash'></i>",
        condition: () => isOwner && !isEquipped,
        callback: () => item.deleteDialog(),
        group: "manage"
      }, {
        name: "ARTICHRON.ContextMenu.Item.Unequip",
        icon: "<i class='fa-solid fa-fw fa-shield-halved'></i>",
        condition: () => canEquip && isOwner && isEquipped,
        callback: () => item.system.unequip(),
        group: "action"
      }, {
        name: "ARTICHRON.ContextMenu.Item.Favorite",
        icon: "<i class='fa-solid fa-fw fa-star'></i>",
        condition: () => canEquip && isOwner && !item.isFavorite,
        callback: () => item.actor.addFavoriteItem(item.id),
        group: "action"
      }, {
        name: "ARTICHRON.ContextMenu.Item.Unfavorite",
        icon: "<i class='fa-regular fa-fw fa-star'></i>",
        condition: () => canEquip && isOwner && item.isFavorite,
        callback: () => item.actor.removeFavoriteItem(item.id),
        group: "action"
      }, {
        name: "ARTICHRON.ContextMenu.Item.Use",
        icon: `<i class="fa-solid fa-fw fa-${item.isArsenal ? "hand-fist" : "hand-sparkles"}"></i>`,
        condition: () => canEquip && isOwner && (isEquipped || (!item.isArsenal && !item.isArmor)),
        callback: () => item.use(),
        group: "action"
      }, {
        name: "ARTICHRON.ContextMenu.Item.Fuse",
        icon: "<i class='fa-solid fa-fw fa-volcano'></i>",
        condition: () => canEquip && isOwner && item.hasFusions && !item.isFused,
        callback: () => item.fuseDialog(),
        group: "action"
      }, {
        name: "ARTICHRON.ContextMenu.Item.Unfuse",
        icon: "<i class='fa-solid fa-fw fa-recycle'></i>",
        condition: () => canEquip && isOwner && item.isFused,
        callback: () => item.system.unfuseDialog(),
        group: "action"
      }];
    }

    /* -------------------------------------------------- */
    /*   Drag and drop handlers                           */
    /* -------------------------------------------------- */

    /**
     * Set up drag-and-drop handlers.
     */
    _setupDragAndDrop() {
      const dd = new DragDrop({
        dragSelector: ".compact inventory-item, [data-item-uuid] .wrapper",
        dropSelector: ".application",
        permissions: {
          dragstart: this._canDragStart.bind(this),
          drop: this._canDragDrop.bind(this)
        },
        callbacks: {
          dragstart: this._onDragStart.bind(this),
          drop: this._onDrop.bind(this)
        }
      });
      dd.bind(this.element);
    }

    /* -------------------------------------------------- */

    /**
     * Can the user start a drag event?
     * @param {string} selector     The selector used to initiate the drag event.
     * @returns {boolean}
     */
    _canDragStart(selector) {
      return true;
    }

    /* -------------------------------------------------- */

    /**
     * Can the user perform a drop event?
     * @param {string} selector     The selector used to initiate the drop event.
     * @returns {boolean}
     */
    _canDragDrop(selector) {
      return this.isEditable && this.document.isOwner;
    }

    /* -------------------------------------------------- */

    /**
     * Handle a drag event being initiated.
     * @param {DragEvent} event     The initiating drag event.
     */
    async _onDragStart(event) {
      const uuid = event.currentTarget.closest("[data-item-uuid]").dataset.itemUuid;
      const item = await fromUuid(uuid);
      const data = item.toDragData();
      event.dataTransfer.setData("text/plain", JSON.stringify(data));
    }

    /* -------------------------------------------------- */

    /**
     * Handle a drop event.
     * @param {Event} event     The initiating drop event.
     */
    async _onDrop(event) {
      event.preventDefault();
      const target = event.target;
      const item = await fromUuid(TextEditor.getDragEventData(event).uuid);
      const actor = this.document;

      const changes = {items: [], itemUpdates: [], effects: [], effectUpdates: [], actorUpdates: {}};

      switch (item.documentName) {
        case "ActiveEffect":
          await this._onDropActiveEffect(item, target, changes);
          break;
        case "Actor":
          await this._onDropActor(item, target, changes);
          break;
        case "Folder":
          await this._onDropFolder(item, target, changes);
          break;
        case "Item":
          await this._onDropItem(item, target, changes);
          break;
        default:
          return;
      }

      const {items, itemUpdates, effects, effectUpdates, actorUpdates} = changes;

      Promise.all([
        foundry.utils.isEmpty(actorUpdates) ? null : actor.update(actorUpdates),
        foundry.utils.isEmpty(items) ? null : actor.createEmbeddedDocuments("Item", items),
        foundry.utils.isEmpty(itemUpdates) ? null : actor.updateEmbeddedDocuments("Item", itemUpdates),
        foundry.utils.isEmpty(effects) ? null : actor.createEmbeddedDocuments("ActiveEffect", effects),
        foundry.utils.isEmpty(effectUpdates) ? null : actor.updateEmbeddedDocuments("ActiveEffect", effectUpdates)
      ]);
    }

    /* -------------------------------------------------- */

    /**
     * Handle dropping an effect onto the sheet.
     * @param {Folder} document         The effect being dropped.
     * @param {HTMLElement} target      The direct target dropped onto.
     * @param {object} changes          Object of changes to be made to this document.
     */
    async _onDropActiveEffect(document, target, changes) {
      if (document.parent?.parent === this.document) return;
      if (document.parent === this.document) {
        await this._onSortActiveEffect(document, target, changes);
        return;
      }

      const effectData = foundry.utils.mergeObject(document.toObject(), {
        "duration.-=combat": null,
        "duration.-=startRound": null,
        "duration.-=startTime": null,
        "duration.-=startTurn": null,
        "system.source": null,
        "-=ownership": null,
        "-=sort": null
      }, {performDeletions: true});

      changes.effects.push(effectData);
    }

    /* -------------------------------------------------- */

    /**
     * Handle dropping an actor onto the sheet.
     * @param {Folder} document         The actor being dropped.
     * @param {HTMLElement} target      The direct target dropped onto.
     * @param {object} changes          Object of changes to be made to this document.
     */
    async _onDropActor(document, target, changes) {}

    /* -------------------------------------------------- */

    /**
     * Handle dropping a folder of items onto the sheet.
     * @param {Folder} document         The folder being dropped.
     * @param {HTMLElement} target      The direct target dropped onto.
     * @param {object} changes          Object of changes to be made to this document.
     */
    async _onDropFolder(document, target, changes) {
      if (document.type !== "Item") return;

      for (let item of document.contents) {
        if (!(item instanceof Item)) item = await fromUuid(item.uuid);
        await this._onDropItem(item, target, changes);
      }

      for (const folder of document.getSubfolders()) {
        await this._onDropFolder(folder, target, changes);
      }
    }

    /* -------------------------------------------------- */

    /**
     * Handle dropping a single item onto the sheet.
     * @param {ItemArtichron} document      The item being dropped.
     * @param {HTMLElement} target          The direct target dropped onto.
     * @param {object} changes              Object of changes to be made to this document.
     */
    async _onDropItem(document, target, changes) {
      if (document.parent === this.document) {
        await this._onSortItem(document, target, changes);
        return;
      }

      if (document.system.identifier && document.system.schema.has("quantity")) {
        const existing = this.document.itemTypes[document.type].find(item => {
          return item.system.identifier === document.system.identifier;
        });
        if (existing) {
          changes.itemUpdates.push({
            _id: existing.id,
            "system.quantity.value": existing.system.quantity.value + document.system.quantity.value
          });
          return;
        }
      }

      const itemData = game.items.fromCompendium(document);
      changes.items.push(itemData);
    }

    /* -------------------------------------------------- */

    /**
     * Perform sorting of items.
     * @param {ItemArtichron} document      The item being dropped.
     * @param {HTMLElement} target          The direct target dropped onto.
     * @param {object} changes              Object of changes to be made to this document.
     */
    async _onSortItem(item, target, changes) {
      if (item.documentName !== "Item") return;
      const self = target.closest("[data-tab]")?.querySelector(`[data-item-uuid="${item.uuid}"]`);
      if (!self || !target.closest("[data-item-uuid]")) return;

      let sibling = target.closest("[data-item-uuid]") ?? null;
      if (sibling?.dataset.itemUuid === item.uuid) return;
      if (sibling) sibling = await fromUuid(sibling.dataset.itemUuid);

      let siblings = target.closest("[data-tab]").querySelectorAll("[data-item-uuid]");
      siblings = await Promise.all(Array.from(siblings).map(s => fromUuid(s.dataset.itemUuid)));
      siblings.findSplice(i => i === item);

      let updates = SortingHelpers.performIntegerSort(item, {target: sibling, siblings: siblings, sortKey: "sort"});
      updates = updates.map(({target, update}) => ({_id: target.id, sort: update.sort}));
      changes.itemUpdates.push(...updates);
    }

    /* -------------------------------------------------- */

    /**
     * Perform sorting of active effects.
     * @param {ActiveEffectArtichron} document      The document being sorted.
     * @param {HTMLElement} target                  The direct target dropped onto.
     * @param {object} changes                      Object of changes to be made to this document.
     */
    async _onSortActiveEffect(document, target, changes) {
      if (document.documentName !== "ActiveEffect") return;

      let sibling = target.closest("[data-item-uuid]");
      if (!sibling) return;
      if (sibling.dataset.itemUuid === document.uuid) return;
      sibling = await fromUuid(sibling.dataset.itemUuid);

      let siblings = target.closest(".effects-list").querySelectorAll("[data-item-uuid]");
      siblings = await Promise.all(Array.from(siblings).map(s => fromUuid(s.dataset.itemUuid)));
      siblings.findSplice(s => s === document);

      let updates = SortingHelpers.performIntegerSort(document, {target: sibling, siblings: siblings, sortKey: "sort"});
      updates = updates.map(({target, update}) => ({_id: target.id, sort: update.sort}));
      changes.effectUpdates.push(...updates);
    }

    /* -------------------------------------------------- */
    /*   Event handlers                                   */
    /* -------------------------------------------------- */

    /**
     * Handle editing the document's image.
     * @this {DocumentSheetArtichron}
     * @param {PointerEvent} event      The originating click event.
     * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
     */
    static #onEditImage(event, target) {
      if (!this.isEditable) return;
      const current = this.document.img;
      const fp = new FilePicker({
        type: "image",
        current: current,
        callback: path => this.document.update({img: path}),
        top: this.position.top + 40,
        left: this.position.left + 10
      });
      fp.browse();
    }

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
      effect.update({disabled: !effect.disabled});
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
      getDocumentClass("ActiveEffect").createDialog({
        img: "icons/svg/sun.svg"
      }, {types: [type], parent: this.document});
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

export default ArtichronSheetMixin;
