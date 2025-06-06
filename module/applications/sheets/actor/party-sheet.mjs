import ActorSheetArtichron from "./actor-sheet-base.mjs";

export default class PartySheet extends ActorSheetArtichron {
  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["party"],
    position: { width: 650, height: 800 },
    actions: {
      clockDelta: PartySheet.#clockDelta,
      displayActor: PartySheet.#displayActor,
      distributeCurrency: PartySheet.#distributeCurrency,
      manageFunds: PartySheet.#manageFunds,
      placeMembers: PartySheet.#placeMembers,
      recallMembers: PartySheet.#recallMembers,
      removeMember: PartySheet.#removeMember,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    header: {
      template: "systems/artichron/templates/sheets/actor/party/header.hbs",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    health: {
      template: "systems/artichron/templates/sheets/actor/party/health.hbs",
    },
    members: {
      template: "systems/artichron/templates/sheets/actor/party/members.hbs",
      scrollable: [".members"],
      classes: ["scrollable"],
    },
    inventory: {
      template: "systems/artichron/templates/sheets/actor/party/inventory.hbs",
      scrollable: [".scrollable"],
    },
    progress: {
      template: "systems/artichron/templates/sheets/actor/party/progress.hbs",
      classes: ["scrollable"],
      scrollable: [".scrollable"],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "members", icon: "fa-solid fa-fw fa-users" },
        { id: "inventory", icon: "fa-solid fa-fw fa-boxes" },
        { id: "progress", icon: "fa-solid fa-fw fa-clock" },
      ],
      initial: "members",
      labelPrefix: "ARTICHRON.SHEET.TABS",
    },

  };

  /* -------------------------------------------------- */

  /**
   * The current search query on the inventory tab.
   * @type {string}
   */
  #searchQuery = "";

  /* -------------------------------------------------- */
  /*   Rendering methods                                */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  _prepareTabs(group) {
    const tabs = super._prepareTabs(group);
    if (!game.user.isGM) delete tabs.progress;
    return tabs;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    if (!game.user.isGM) delete parts.progress;
    return parts;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextHeader(context, options) {
    context.ctx = {};
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextHealth(context, options) {
    context.ctx = { members: [] };
    for (const { actor } of this.document.system.members) {
      if (actor) context.ctx.members.push({ actor });
    }
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextMembers(context, options) {
    const members = [];

    for (const { actor } of this.document.system.members) {
      const context = {
        actor: actor,
        isOwner: actor.isOwner,
        isHero: actor.type === "hero",
        isMonster: actor.type === "monster",
        pct: { hp: actor.system.health.pct },
        canView: actor.testUserPermission(game.user, "LIMITED"),
        canManage: actor.isOwner && this.document.isOwner,
      };

      if (context.isHero) {
        context.pct.health = actor.system.pools.health.pct;
        context.pct.stamina = actor.system.pools.stamina.pct;
        context.pct.mana = actor.system.pools.mana.pct;
      } else if (context.isMonster) {
        context.pct.danger = actor.system.danger.pool.pct;
      }

      members.push(context);
    }

    const distributions = {
      currency: {
        value: this.document.system.currency.award,
        disabled: !game.user.isGM || !this.document.system.currency.award || !this.isEditable,
      },
      points: {
        value: this.document.system.points.value,
        disabled: !game.user.isGM || !this.document.system.points.value || !this.isEditable,
      },
    };

    context.ctx = {
      distributions,
      funds: this.document.system.currency.funds,
      actors: members,
    };
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextInventory(context, options) {
    const sections = Array.from(this.document.system.constructor.metadata.allowedItemTypes).map(type => {
      const items = [];
      for (const item of this.document.items.documentsByType[type].toSorted((a, b) => artichron.utils.nameSort(a, b))) {
        items.push({
          document: item,
          count: item.system.schema.has("quantity") ? item.system.quantity.value : null,
          dataset: { name: item.name },
        });
      }
      return {
        items,
        label: game.i18n.localize(`TYPES.Item.${type}Pl`),
      };
    });
    sections.sort((a, b) => a.label.localeCompare(b.label));

    context.ctx = {
      sections,
      searchQuery: this.#searchQuery,
    };
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextProgress(context, options) {
    context.ctx = {
      clocks: [],
    };

    const clocks = context.isEditMode ? this.document.system.clocks.sourceContents : this.document.system.clocks;
    for (const clock of clocks) {
      if (context.isPlayMode) {
        context.ctx.clocks.push({
          clock,
          disableUp: clock.isFull,
          disableDown: clock.isEmpty,
          hue: clock.color.rgb.map(k => k * 255).join(", "),
        });
      } else {
        context.ctx.clocks.push({
          clock,
          fields: clock.schema.fields,
          source: clock._source,
          colorPlaceholder: clock.constructor.metadata.color,
        });
      }
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _canDragStart(selector) {
    return this.isEditable && this.document.isOwner;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onDropActor(event, actor) {
    if (!this.document.isOwner) return;
    const isMembers = this.tabGroups.primary === "members";
    if (!isMembers) return;
    this.document.system.addMember(actor);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onDropItem(event, item) {
    if (!this.document.isOwner) return;
    if (!this.document.system.constructor.metadata.has(item.type)) return;
    return super._onDropItem(event, item);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    for (const { actor } of this.document.system.members) {
      if (actor) actor.apps[this.id] = this;
    }

    // Clock context menus.
    this._createContextMenu(
      this.#getContextOptionsClock,
      "progress-clock",
      { hookName: "ClockEntryContext" },
    );

    // Item context menus.
    this._createContextMenu(
      this.#getContextOptionsItem,
      ".document-list-entries.items .entry",
      { hookName: "ItemEntryContext" },
    );
  }

  /* -------------------------------------------------- */

  /**
   * Get context menu options for clocks.
   * @returns {ContextMenuEntry[]}
   */
  #getContextOptionsClock() {
    if (!this.isEditable) return [];

    return [{
      name: "ARTICHRON.SHEET.PARTY.CONTEXT.CLOCK.render",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      callback: clock => this._getPseudoDocument(clock).sheet.render({ force: true }),
    }, {
      name: "ARTICHRON.SHEET.PARTY.CONTEXT.CLOCK.delete",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      callback: clock => this._getPseudoDocument(clock).delete(),
    }];
  }

  /* -------------------------------------------------- */

  /**
   * Get context menu options for items.
   * @returns {ContextMenuEntry[]}
   */
  #getContextOptionsItem() {
    if (!this.isEditable) return [];

    return [{
      name: "ARTICHRON.SHEET.PARTY.CONTEXT.ITEM.render",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      callback: entry => this._getEmbeddedDocument(entry).sheet.render({ force: true }),
    }, {
      name: "ARTICHRON.SHEET.PARTY.CONTEXT.ITEM.delete",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      callback: entry => this._getEmbeddedDocument(entry).delete(),
    }];
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onClose(options) {
    for (const { actor } of this.document.system.members) {
      if (actor) delete actor.apps[this.id];
    }
    super._onClose(options);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);

    if (partId === "members") {
      htmlElement.querySelectorAll("[data-change=changeCurrency]").forEach(input => {
        input.addEventListener("change", this.#changeCurrency.bind(this));
      });
    }

    if (partId === "inventory") {
      // TODO: This code copied wholesale from hero sheet.
      const input = htmlElement.querySelector("#inventory-search");
      const callback = foundry.utils.debounce(this.#onSearchFilter, 200).bind(this);
      input.addEventListener("input", event => {
        const query = event.currentTarget.value.toLowerCase().trim();
        this.#searchQuery = query;
        callback(query, htmlElement);
      });
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _syncPartState(partId, newElement, priorElement, state) {
    super._syncPartState(partId, newElement, priorElement, state);

    if (partId === "inventory") {
      this.#onSearchFilter(this.#searchQuery, newElement);
    }
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Toggle the 'hidden' state of inventory items.
   * @param {string} query          The input value.
   * @param {HTMLElement} html      The targeted html container.
   */
  #onSearchFilter(query, html) {
    for (const item of html.querySelectorAll(".document-list-entries .entry")) {
      const hidden = !!query && !item.dataset.name.toLowerCase().includes(query);
      item.classList.toggle("hidden", hidden);
    }
  }

  /* -------------------------------------------------- */

  /**
   * Change the currency of a party member.
   * @param {PointerEvent} event    The initiating change event.
   */
  #changeCurrency(event) {
    const id = event.currentTarget.closest("[data-id]").dataset.id;
    const actor = this.document.system.members.get(id).actor;
    const result = artichron.utils.parseInputDelta(event.currentTarget, actor);
    if (result !== undefined) actor.update({ "system.currency.funds": result });
  }

  /* -------------------------------------------------- */

  /**
   * Prompt to distribute to the party an amount of currency.
   * @this {PartySheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #distributeCurrency(event, target) {
    this.document.system.distributeCurrencyDialog();
  }

  /* -------------------------------------------------- */

  /**
   * Display an actor when the avatar is clicked.
   * @this {PartySheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #displayActor(event, target) {
    const id = target.closest(".member").dataset.id;
    const actor = game.actors.get(id);
    actor.sheet.render({ force: true });
  }

  /* -------------------------------------------------- */

  /**
   * Render a party funds dialog to deposit or withdraw funds for one member.
   * @this {PartySheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static async #manageFunds(event, target) {
    const id = target.closest(".member").dataset.id;
    const actor = game.actors.get(id);
    const config = await artichron.applications.apps.actor.PartyFundsDialog.create({ party: this.document, member: actor });
    if (!config || !(config.amount > 0)) return;
    const path = "system.currency.funds";

    // Current values
    const af = foundry.utils.getProperty(actor, path);
    const pf = foundry.utils.getProperty(this.document, path);

    // New values
    const av = config.deposit ? af - config.amount : af + config.amount;
    const pv = config.deposit ? pf + config.amount : pf - config.amount;

    if (av < 0) {
      ui.notifications.warn("ARTICHRON.PartyFundsDialog.InsufficientMemberFunds", { localize: true });
      return;
    }

    if (pv < 0) {
      ui.notifications.warn("ARTICHRON.PartyFundsDialog.InsufficientPartyFunds", { localize: true });
      return;
    }

    const Cls = foundry.utils.getDocumentClass("ChatMessage");

    Promise.all([
      actor.update({ [path]: av }),
      this.document.update({ [path]: pv }),
      Cls.create({
        speaker: Cls.getSpeaker({ actor: this.document }),
        content: game.i18n.format(`ARTICHRON.PartyFundsDialog.Receipt${config.deposit ? "Deposit" : "Withdraw"}`, {
          name: actor.name, amount: config.amount,
        }),
      }),
    ]);
  }

  /* -------------------------------------------------- */

  /**
   * Place the members of this party.
   * @this {PartySheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static async #placeMembers(event, target) {
    await this.minimize();
    await this.document.system.placeMembers();
    this.maximize();
  }

  /* -------------------------------------------------- */

  /**
   * Recall the members of this party.
   * @this {PartySheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static async #recallMembers(event, target) {
    const token = this.document.isToken ? this.document.token?.object : this.document.getActiveTokens()[0];
    if (token) token.document.recallMembers();
  }

  /* -------------------------------------------------- */

  /**
   * Remove this member from this party.
   * @this {PartySheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #removeMember(event, target) {
    const id = target.closest(".member").dataset.id;
    const actor = game.actors.get(id);
    this.document.system.removeMember(actor);
  }

  /* -------------------------------------------------- */

  /**
   * Adjust the value of a clock.
   * @this {PartySheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #clockDelta(event, target) {
    const isUp = target.dataset.delta === "up";
    const clock = this._getPseudoDocument(target);
    if (isUp) clock.increase();
    else clock.decrease();
  }
}
