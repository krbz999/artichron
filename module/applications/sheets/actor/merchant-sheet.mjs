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
      template: "systems/artichron/templates/sheets/actor/merchant/header.hbs",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    stock: {
      template: "systems/artichron/templates/sheets/actor/merchant/stock.hbs",
      scrollable: [".document-list-entries"],
    },
    cart: {
      template: "systems/artichron/templates/sheets/actor/merchant/cart.hbs",
      scrollable: [".document-list-entries"],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "stock", icon: "fa-solid fa-fw fa-boxes-stacked" },
        { id: "cart", icon: "fa-solid fa-fw fa-shopping-cart" },
      ],
      initial: "stock",
      labelPrefix: "ARTICHRON.SHEET.TABS",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return "";
  }

  /* -------------------------------------------------- */
  /*   Rendering methods                                */
  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextHeader(context, options) {
    const ctx = context.ctx = {};
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextStock(context, options) {
    const ctx = context.ctx = { stock: [] };

    const staged = Object.entries(this.document.system.shop.staged).reduce((acc, [actorId, itemIds]) => {
      const actor = game.actors.get(actorId);
      if (!actor) return acc;
      const items = new Set(Array.from(itemIds).map(itemId => this.document.items.get(itemId)).filter(_ => _));
      return acc.union(items);
    }, new Set());

    for (const item of this.document.items) {
      const data = { document: item };
      if (!staged.has(item)) ctx.stock.push(data);
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextCart(context, options) {
    const ctx = context.ctx = { cart: [] };

    const staged = Object.entries(this.document.system.shop.staged).reduce((acc, [actorId, itemIds]) => {
      const actor = game.actors.get(actorId);
      if (!actor) return acc;
      const items = new Set(Array.from(itemIds).map(itemId => this.document.items.get(itemId)).filter(_ => _));
      return acc.union(items);
    }, new Set());

    for (const item of this.document.items) {
      const data = { document: item };
      if (staged.has(item)) ctx.cart.push(data);
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);

    // Don't allow interaction when in a pack unless GM.
    if (this.document.inCompendium) {
      const pack = this.document.collection;
      if (pack.locked || !game.user.isGM) return;
    }

    // Add context menu for stock.
    this._createContextMenu(
      this.#getContextOptionsStock,
      ".document-list.stock .entry",
      { hookName: "ItemEntryContext" },
    );

    // Add context menu for cart.
    this._createContextMenu(
      this.#getContextOptionsCart,
      ".document-list.cart .entry",
      { hookName: "ItemEntryContext" },
    );
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    for (const list of this.element.querySelectorAll(".document-list-entries")) {
      list.classList.toggle("compact", this.position.width < 700);
    }
  }

  /* -------------------------------------------------- */

  /**
   * Create context menu options for items in stock.
   * @returns {object[]}
   */
  #getContextOptionsStock() {
    const itemId = entry => this._getEmbeddedDocument(entry).id;
    const actorId = () => game.user.character ? game.user.character.id : game.actors.part.id;

    return [{
      name: "ARTICHRON.SHEET.MERCHANT.CONTEXT.STOCK.addToCart",
      icon: "<i class='fa-solid fa-fw fa-cart-plus'></i>",
      callback: entry => game.users.activeGM?.query("merchant", { type: "stage", config: {
        itemId: itemId(entry), actorId: actorId(), merchantId: this.document.id,
      } }, { timeout: 10_000 }),
    }];
  }

  /* -------------------------------------------------- */

  /**
   * Create context menu options for items in cart.
   * @returns {object[]}
   */
  #getContextOptionsCart() {
    const itemId = entry => this._getEmbeddedDocument(entry).id;
    const actorId = () => game.user.character ? game.user.character.id : game.actors.part.id;

    return [{
      name: "ARTICHRON.SHEET.MERCHANT.CONTEXT.CART.removeFromCart",
      icon: "<i class='fa-solid fa-fw fa-shopping-cart'></i>",
      callback: entry => game.users.activeGM?.query("merchant", { type: "unstage", config: {
        itemId: itemId(entry), actorId: actorId(), merchantId: this.document.id,
      } }, { timeout: 10_000 }),
    }];
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onPosition(position) {
    super._onPosition(position);
    for (const list of this.element.querySelectorAll(".document-list-entries")) {
      list.classList.toggle("compact", position.width < 700);
    }
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
