import ActorSheetArtichron from "./actor-sheet-base.mjs";

export default class MerchantSheet extends ActorSheetArtichron {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["merchant"],
    viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
    sheetConfig: false,
    actions: {
      configure: MerchantSheet.#configure,
      checkout: MerchantSheet.#checkout,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    header: {
      template: "systems/artichron/templates/sheets/actor/merchant-sheet/header.hbs",
    },
    trading: {
      template: "systems/artichron/templates/sheets/actor/merchant-sheet/trading.hbs",
      scrollable: [".stock", ".cart .contents"],
    },
  };

  /* -------------------------------------------------- */
  /*   Rendering methods                                */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = {};

    const { stock, cart } = await this._prepareItems();

    context.stock = stock;
    context.cart = cart;
    context.actor = this.document;
    context.isOwner = this.document.isOwner;
    context.label = this.document.system.shop.name;
    context.isGM = game.user.isGM;
    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareItems() {
    const items = { stock: {}, cart: [] };
    const staged = Object.entries(this.document.system.shop.staged).reduce((acc, [actorId, itemIds]) => {
      const actor = game.actors.get(actorId);
      if (!actor) return acc;
      const items = new Set(Array.from(itemIds).map(itemId => this.document.items.get(itemId)).filter(_ => _));
      return acc.union(items);
    }, new Set());

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
        data.enriched = await foundry.applications.ux.TextEditor.enrichHTML(item.system.description.value, {
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

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this._setupDragAndDrop();
  }

  /* -------------------------------------------------- */
  /*   Drag and drop handlers                           */
  /* -------------------------------------------------- */

  /**
   * Set up additional drag-drop handlers.
   */
  _setupDragAndDrop() {
    const isLocked = () => {
      if (this.document.pack) {
        const pack = game.packs.get(this.document.pack);
        if (pack.locked) return true;
      }
      return false;
    };

    const defaultActor = () => {
      if (game.user.character) return game.user.character.id;
      return game.actors.party.id;
    };

    // Staging an item.
    const stageDrop = new foundry.applications.ux.DragDrop({
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
          const item = await fromUuid(foundry.applications.ux.TextEditor.getDragEventData(event).uuid);
          this._expandedItems.delete(item.uuid);
          game.users.activeGM?.query("merchant", {
            type: "stage",
            config: {
              itemId: item.id,
              actorId: defaultActor(),
              merchantId: this.document.id,
            },
          });
        },
      },
    });
    stageDrop.bind(this.element);

    // Unstaging an item.
    const unstageDrop = new foundry.applications.ux.DragDrop({
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
          const item = await fromUuid(foundry.applications.ux.TextEditor.getDragEventData(event).uuid);
          this._expandedItems.delete(item.uuid);
          game.users.activeGM?.query("merchant", {
            type: "unstage",
            config: {
              itemId: item.id,
              actorId: defaultActor(),
              merchantId: this.document.id,
            },
          });
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
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #configure(event, target) {
    if (!this.document.isOwner) return;
    this.document.system.configure();
  }

  /* -------------------------------------------------- */

  /**
   * Finalize the purchase.
   * @this {MerchantSheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #checkout(event, target) {
    this.document.system.finalizePurchase();
  }
}
