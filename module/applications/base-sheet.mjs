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
export const ArtichronSheetMixin = Base => {
  const mixin = foundry.applications.api.HandlebarsApplicationMixin;
  return class DocumentSheetArtichron extends mixin(Base) {

    /**
     * Different sheet modes.
     * @enum {number}
     */
    static SHEET_MODES = {EDIT: 0, PLAY: 1};

    /** @override */
    static DEFAULT_OPTIONS = {
      form: {submitOnChange: true},
      actions: {
        editImage: this._onEditImage,
        toggleSheet: this._onToggleSheet,
        toggleOpacity: this._ontoggleOpacity,
        toggleEffect: this._onToggleEffect,
        editEffect: this._onEditEffect,
        deleteEffect: this._onDeleteEffect,
        createEffect: this._onCreateEffect,
        toggleDescription: this._onToggleDescription
      }
    };

    /**
     * The current sheet mode.
     * @type {number}
     */
    _sheetMode = this.constructor.SHEET_MODES.PLAY;

    /**
     * Is the sheet currently in 'Play' mode?
     * @type {boolean}
     */
    get isPlayMode() {
      return this._sheetMode === this.constructor.SHEET_MODES.PLAY;
    }

    /**
     * Is the sheet currently in 'Edit' mode?
     * @type {boolean}
     */
    get isEditMode() {
      return this._sheetMode === this.constructor.SHEET_MODES.EDIT;
    }

    /**
     * A set of uuids of embedded documents whose descriptions have been expanded on this sheet.
     * @type {Set<string>}
     */
    _expandedItems = new Set();

    /**
     * Convenience method for preparing a document's description for direct insertion.
     * @param {HTMLElement} target      The containing element.
     * @param {string} uuid             The uuid of the document.
     */
    async _insertDocumentDescription(target, uuid) {
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

    /**
     * Prepare effects for rendering.
     * @returns {object[]}
     */
    async _prepareEffects() {
      const effects = [];

      const entry = async (effect) => {
        let sourceItem = null;
        let sourceActor = null;

        // Create label for transferred effects.
        if ((effect.type === "buff") && effect.system.source) {
          sourceItem = await fromUuid(effect.system.source);
          sourceActor = sourceItem?.parent?.name ?? "";
          sourceItem = sourceItem?.name ?? "";
        } else if (effect.type === "fusion") {
          sourceItem = effect.system.itemData?.name ?? "";
        }

        const isItem = effect.parent instanceof Item;
        const transfer = isItem && effect.transfer;

        const data = {
          effect: effect,
          uuid: effect.uuid,
          img: effect.img,
          name: effect.name,
          sourceItem: sourceItem,
          sourceActor: sourceActor,
          disabled: effect.disabled,
          transfer: transfer,
          parentName: transfer && (this.document instanceof Actor) ? effect.parent.name : null,
          isExpanded: this._expandedItems.has(effect.uuid),

          isActiveFusion: effect.isActiveFusion,
          isFusionOption: effect.transferrableFusion
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
      this._setupDragAndDrop();
    }

    /** @override */
    _syncPartState(partId, newElement, priorElement, state) {
      super._syncPartState(partId, newElement, priorElement, state);

      // Refocus on a delta.
      const focus = newElement.querySelector(":focus");
      if (focus && focus.classList.contains("delta")) focus.select();

      // Fade in or out a toggled effect.
      if (partId === "effects") {
        newElement.querySelectorAll("[data-item-uuid].effect").forEach(n => {
          const uuid = n.dataset.itemUuid;
          const newWrapper = n.querySelector(".wrapper");
          const oldWrapper = priorElement.querySelector(`[data-item-uuid="${uuid}"].effect .wrapper`);
          if (oldWrapper) {
            newWrapper.animate([
              {opacity: oldWrapper.style.opacity},
              {opacity: newWrapper.style.opacity}
            ], {duration: 200, easing: "ease-in-out"});
          }
        });
      }
    }

    /* ---------------------------------------- */
    /*           DRAG AND DROP HANDLERS         */
    /* ---------------------------------------- */

    /**
     * Set up drag-and-drop handlers.
     */
    _setupDragAndDrop() {
      const dd = new DragDrop({
        dragSelector: "[data-item-uuid]",
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

    /**
     * Can the user start a drag event?
     * @param {string} selector     The selector used to initiate the drag event.
     * @returns {boolean}
     */
    _canDragStart(selector) {
      return true;
    }

    /**
     * Can the user perform a drop event?
     * @param {string} selector     The selector used to initiate the drop event.
     * @returns {boolean}
     */
    _canDragDrop(selector) {
      return this.document.isOwner;
    }

    /**
     * Handle a drag event being initiated.
     * @param {Event} event
     */
    async _onDragStart(event) {
      const uuid = event.currentTarget.dataset.itemUuid;
      const item = await fromUuid(uuid);
      const data = item.toDragData();
      event.dataTransfer.setData("text/plain", JSON.stringify(data));
    }

    /**
     * Handle a drop event.
     * @param {Event} event
     */
    async _onDrop(event) {
      event.preventDefault();
      const target = event.target;
      const {type, uuid} = TextEditor.getDragEventData(event);
      if (!this.isEditable) return;
      const item = await fromUuid(uuid);
      const itemData = item.toObject();

      // Disallow dropping invalid document types.
      if (!Object.keys(this.document.constructor.metadata.embedded).includes(type)) return;

      // Disallow dropping effects from items onto the item's parent.
      if (item.parent.parent === this.document) return;

      // If dropped onto self, perform sorting.
      if (item.parent === this.document) return this._onSortItem(item, target);

      const modification = {
        "-=_id": null,
        "-=ownership": null,
        "-=folder": null,
        "-=sort": null
      };

      switch (type) {
        case "ActiveEffect": {
          foundry.utils.mergeObject(modification, {
            "duration.-=combat": null,
            "duration.-=startRound": null,
            "duration.-=startTime": null,
            "duration.-=startTurn": null,
            "system.source": null
          });
          break;
        }
        case "Item": {
          break;
        }
        default: return;
      }

      foundry.utils.mergeObject(itemData, modification, {performDeletions: true});
      getDocumentClass(type).create(itemData, {parent: this.document});
    }

    /**
     * Perform sorting of items.
     * @param {ItemArtichron} item      The document being dropped.
     * @param {HTMLElement} target      The direct target dropped onto.
     */
    async _onSortItem(item, target) {
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
      this.document.updateEmbeddedDocuments("Item", updates);
    }

    /* ---------------------------------------- */
    /*              EVENT HANDLERS              */
    /* ---------------------------------------- */

    /**
     * Handle editing the document's image.
     * @param {Event} event             The initiating click event.
     * @param {HTMLElement} target      The current target of the event listener.
     */
    static _onEditImage(event, target) {
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

    /**
     * Handle toggling the Opacity lock of the sheet.
     * @param {Event} event             The initiating click event.
     * @param {HTMLElement} target      The current target of the event listener.
     */
    static _ontoggleOpacity(event, target) {
      target.closest(".application").classList.toggle("opacity");
    }

    /**
     * Handle toggling between Edit and Play mode.
     * @param {Event} event             The initiating click event.
     * @param {HTMLElement} target      The current target of the event listener.
     */
    static _onToggleSheet(event, target) {
      const modes = this.constructor.SHEET_MODES;
      this._sheetMode = this.isEditMode ? modes.PLAY : modes.EDIT;
      this.render();
    }

    /**
     * Handle toggling an active effect on or off.
     * @param {Event} event             The initiating click event.
     * @param {HTMLElement} target      The current target of the event listener.
     */
    static async _onToggleEffect(event, target) {
      const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
      const effect = await fromUuid(uuid);
      effect.update({disabled: !effect.disabled});
    }

    /**
     * Handle click events to render an effect's sheet.
     * @param {Event} event             The initiating click event.
     * @param {HTMLElement} target      The current target of the event listener.
     */
    static async _onEditEffect(event, target) {
      const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
      const effect = await fromUuid(uuid);
      effect.sheet.render(true);
    }

    /**
     * Handle click events to delete an effect.
     * @param {Event} event             The initiating click event.
     * @param {HTMLElement} target      The current target of the event listener.
     */
    static async _onDeleteEffect(event, target) {
      const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
      const effect = await fromUuid(uuid);
      effect.deleteDialog();
    }

    /**
     * Handle click events to create an effect.
     * @param {Event} event             The initiating click event.
     * @param {HTMLElement} target      The current target of the event listener.
     */
    static _onCreateEffect(event, target) {
      const type = target.dataset.type;
      // TODO: issue 10870, only allow for buffs and/or fusions, depending.
      getDocumentClass("ActiveEffect").createDialog({
        type: type, img: "icons/svg/sun.svg"
      }, {parent: this.document});
    }

    /**
     * Handle click events to toggle a document's description.
     * @param {Event} event             The initiating click event.
     * @param {HTMLElement} target      The current target of the event listener.
     */
    static _onToggleDescription(event, target) {
      const item = target.closest("[data-item-uuid]");
      const has = item.classList.toggle("expanded");
      item.classList.remove("no-transition");
      const uuid = item.dataset.itemUuid;
      if (has) this._expandedItems.add(uuid);
      else this._expandedItems.delete(uuid);
      this._insertDocumentDescription(item, uuid);
    }
  };
};
