import ActorSheetArtichron from "./actor-sheet-base.mjs";

export default class MerchantSheet extends ActorSheetArtichron {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["merchant"],
    viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
    sheetConfig: false,
    position: {width: 1000},
    window: {contentClasses: ["standard-form"]}
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    unstaged: {
      template: "systems/artichron/templates/actor/merchant-unstaged.hbs"
    },
    staged: {
      template: "systems/artichron/templates/actor/merchant-staged.hbs"
    }
  };

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /* -------------------------------------------------- */
  /*   Rendering methods                                */
  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = {};

    context.actor = this.document;
    context.items = await this._prepareItems();

    return context;
  }

  /* -------------------------------------------------- */

  /** @override */
  async _prepareItems() {
    const items = {
      available: [],
      staged: []
    };
    const staged = this.document.system.stagedItems;
    for (const item of this.document.items) {
      const isStaged = staged.has(item);

      const expanded = this._expandedItems.has(item.uuid);
      const data = {
        item: item,
        isExpanded: expanded,
        hasQty: "quantity" in item.system,
        price: item.system.price?.value || "-"
      };

      if (expanded) {
        data.enrichedText = await TextEditor.enrichHTML(item.system.description.value, {
          relativeTo: item, rollData: item.getRollData()
        });
      }

      if (isStaged) items.staged.push(data);
      else items.available.push(data);
    }
    items.available.sort((a, b) => a.item.name.localeCompare(b.item.name));

    return items;
  }

  /* -------------------------------------------------- */
  /*   Drag and drop handlers                           */
  /* -------------------------------------------------- */

  /** @override */
  _setupDragAndDrop() {
    let dd = new DragDrop({
      dragSelector: "[data-item-uuid] .wrapper",
      dropSelector: ".stage-area",
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

    dd = new DragDrop({
      dropSelector: ".stock-area",
      permissions: {drop: this._canDragDrop.bind(this)},
      callbacks: {drop: this._onDrop.bind(this)}
    });
    dd.bind(this.element);
  }

  /* -------------------------------------------------- */

  /** @override */
  _canDragStart(selector) {
    return true;
  }

  /* -------------------------------------------------- */

  /** @override */
  _canDragDrop(selector) {
    if (!this.isEditable) return false;
    return this.document.isOwner || (selector === ".stage-area");
  }

  /* -------------------------------------------------- */

  /** @override */
  async _onDrop(event) {
    event.preventDefault();
    const target = event.target;
    const isStage = !!target.closest(".stage-area");
    const isStock = !!target.closest(".stock-area");
    const {type, uuid} = TextEditor.getDragEventData(event);
    const item = await fromUuid(uuid);

    // Dropping merchant's own item
    if ((item.parent === this.document) && (type === "Item")) {
      // Sort or stage/unstage item.
      if (isStage) return artichron.utils.sockets.stageMerchantItem(item);
      else if (isStock) return artichron.utils.sockets.unstageMerchantItem(item);
      else if (this.document.isOwner) return this._onSortItem(item, target);
    } else if (this.document.isOwner) {
      return super._onDrop(event);
    }
  }
}
