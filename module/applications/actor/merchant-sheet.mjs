import ActorSheetArtichron from "./actor-sheet-base.mjs";

export default class MerchantSheet extends ActorSheetArtichron {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["merchant"],
    viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
    sheetConfig: false,
    position: {width: 1000}
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
        data.enriched = await TextEditor.enrichHTML(item.system.description.value, {
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
    super._setupDragAndDrop();

    const isLocked = () => {
      if (this.document.pack) {
        const pack = game.packs.get(this.document.pack);
        if (pack.locked) return true;
      }
      return false;
    };

    // Staging an item.
    const stageDrop = new DragDrop({
      dragSelector: ".stock-area inventory-item",
      dropSelector: ".stage-area",
      permissions: {
        dragstart: () => true,
        drop: () => !isLocked()
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        drop: async (event) => {
          event.preventDefault();
          const item = await fromUuid(TextEditor.getDragEventData(event).uuid);
          this._expandedItems.delete(item.uuid);
          artichron.utils.sockets.stageMerchantItem(item);
        }
      }
    });
    stageDrop.bind(this.element);

    // Unstaging an item.
    const unstageDrop = new DragDrop({
      dragSelector: ".stage-area inventory-item",
      dropSelector: ".stock-area",
      permissions: {
        dragstart: () => true,
        drop: () => !isLocked()
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        drop: async (event) => {
          event.preventDefault();
          const item = await fromUuid(TextEditor.getDragEventData(event).uuid);
          this._expandedItems.delete(item.uuid);
          artichron.utils.sockets.unstageMerchantItem(item);
        }
      }
    });
    unstageDrop.bind(this.element);
  }
}
