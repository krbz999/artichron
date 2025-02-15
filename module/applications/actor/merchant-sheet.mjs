import ActorSheetArtichron from "./actor-sheet-base.mjs";
import MerchantConfigurationDialog from "./merchant-configuration-dialog.mjs";

export default class MerchantSheet extends ActorSheetArtichron {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["merchant"],
    viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
    sheetConfig: false,
    position: {
      width: 1000,
      height: 1000,
    },
    actions: {
      configure: MerchantSheet.#configure,
      checkout: MerchantSheet.#checkout,
    },
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {
      template: "systems/artichron/templates/actor/merchant-header.hbs",
    },
    trading: {
      template: "systems/artichron/templates/actor/merchant-trading.hbs",
      scrollable: [".stock", ".cart .contents"],
    },
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

    const { stock, cart } = await this._prepareItems();

    context.stock = stock;
    context.cart = cart;
    context.actor = this.document;
    context.isOwner = this.document.isOwner;
    context.label = this.document.system.shop || this.document.name;
    context.isGM = game.user.isGM;
    return context;
  }

  /* -------------------------------------------------- */

  /** @override */
  async _prepareItems() {
    const items = { stock: {}, cart: [] };
    const staged = this.document.system.stagedItems;

    for (const item of this.document.items) {
      const isStaged = staged.has(item);

      const expanded = this._expandedItems.has(item.uuid);
      const data = {
        item: item,
        isExpanded: expanded,
        hasQty: "quantity" in item.system,
        price: item.system.price?.value || "-",
      };

      if (expanded) {
        data.enriched = await TextEditor.enrichHTML(item.system.description.value, {
          relativeTo: item, rollData: item.getRollData(),
        });
      }

      if (isStaged) items.cart.push(data);
      else {
        items.stock[item.type] ??= {
          label: game.i18n.localize(CONFIG.Item.typeLabels[item.type]),
          items: [],
        };
        items.stock[item.type].items.push(data);
      }
    }

    const sort = (a, b) => a.item.name.localeCompare(b.item.name);

    for (const s of Object.values(items.stock)) s.items.sort(sort);
    items.cart.sort(sort);

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
      dragSelector: ".stock inventory-item",
      dropSelector: ".cart",
      permissions: {
        dragstart: () => true,
        drop: () => !isLocked(),
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        drop: async (event) => {
          event.preventDefault();
          const item = await fromUuid(TextEditor.getDragEventData(event).uuid);
          this._expandedItems.delete(item.uuid);
          artichron.utils.sockets.stageMerchantItem(item);
        },
      },
    });
    stageDrop.bind(this.element);

    // Unstaging an item.
    const unstageDrop = new DragDrop({
      dragSelector: ".cart inventory-item",
      dropSelector: ".stock",
      permissions: {
        dragstart: () => true,
        drop: () => !isLocked(),
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        drop: async (event) => {
          event.preventDefault();
          const item = await fromUuid(TextEditor.getDragEventData(event).uuid);
          this._expandedItems.delete(item.uuid);
          artichron.utils.sockets.unstageMerchantItem(item);
        },
      },
    });
    unstageDrop.bind(this.element);
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Open the merchant actor configuration dialog.
   * @this {MerchantSheet}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #configure(event, target) {
    if (!this.document.isOwner) return;
    new MerchantConfigurationDialog({ document: this.document }).render({ force: true });
  }

  /* -------------------------------------------------- */

  /**
   * Finalize the purchase.
   * @this {MerchantSheet}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #checkout(event, target) {
    this.document.system.finalizePurchase();
  }

}
