import ActorSheetArtichron from "./actor-sheet-base.mjs";

export default class PartySheet extends ActorSheetArtichron {
  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["party"],
    position: { width: 650 },
    actions: {
      addClock: PartySheet.#addClock,
      clockDelta: PartySheet.#clockDelta,
      displayActor: PartySheet.#displayActor,
      distributeCurrency: PartySheet.#distributeCurrency,
      manageFunds: PartySheet.#manageFunds,
      placeMembers: PartySheet.#placeMembers,
      recallMembers: PartySheet.#recallMembers,
      removeClock: PartySheet.#removeClock,
      removeMember: PartySheet.#removeMember,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    header: { template: "systems/artichron/templates/shared/sheet-header.hbs" },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    members: {
      template: "systems/artichron/templates/actor/party-members.hbs",
      scrollable: [".members"],
      classes: ["scrollable"],
    },
    inventory: {
      template: "systems/artichron/templates/actor/party-inventory.hbs",
      scrollable: [".scrollable"],
    },
    progress: {
      template: "systems/artichron/templates/actor/party-progress.hbs",
      scrollable: [".scrollable"],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "members" },
        { id: "inventory" },
        { id: "progress" },
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
  async _prepareContext(options) {
    const context = {
      ...await super._prepareContext(options),
      isEditable: this.isEditable,
      isEditMode: this.isEditMode,
      isPlayMode: this.isPlayMode,
      document: this.document,
      isGM: game.user.isGM,
    };
    if (!context.isGM) delete context.tabs.progress;
    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    switch (partId) {
      case "header":
        return this.#preparePartContextHeader(context, options);
      case "members":
        return this.#preparePartContextMembers(context, options);
      case "inventory":
        return this.#preparePartContextInventory(context, options);
      case "progress":
        return this.#preparePartContextProgress(context, options);
    }

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare the context for a specific part.
   * @param {object} context        Rendering context.
   * @param {object} options        Rendering options.
   * @returns {Promise<object>}     Mutated rendering context.
   */
  async #preparePartContextHeader(context, options) {
    const prop = path => {
      if (context.isEditMode) return foundry.utils.getProperty(this.document._source, path);
      return foundry.utils.getProperty(this.document, path);
    };

    context.header = {
      img: prop("img"),
      name: prop("name"),
    };
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare the context for a specific part.
   * @param {object} context        Rendering context.
   * @param {object} options        Rendering options.
   * @returns {Promise<object>}     Mutated rendering context.
   */
  async #preparePartContextMembers(context, options) {
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

    context.funds = {
      value: this.document.system.currency.funds,
    };

    context.actors = members;
    context.distributions = distributions;
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare the context for a specific part.
   * @param {object} context        Rendering context.
   * @param {object} options        Rendering options.
   * @returns {Promise<object>}     Mutated rendering context.
   */
  async #preparePartContextInventory(context, options) {
    const items = {};

    for (const item of this.document.items) {
      items[item.type] ??= {
        label: game.i18n.localize(`TYPES.Item.${item.type}Pl`),
        order: CONFIG.Item.dataModels[item.type].metadata.order,
        items: [],
      };
      items[item.type].items.push(item);
    }

    for (const { items: itemArray } of Object.values(items)) {
      itemArray.sort((a, b) => {
        const sort = a.sort - b.sort;
        if (sort) return sort;
        return a.name.localeCompare(b.name);
      });
    }

    context.items = Object.fromEntries(Object.entries(items).sort((a, b) => {
      return a[1].order - b[1].order;
    }));

    context.searchQuery = this.#searchQuery;

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare the context for a specific part.
   * @param {object} context        Rendering context.
   * @param {object} options        Rendering options.
   * @returns {Promise<object>}     Mutated rendering context.
   */
  async #preparePartContextProgress(context, options) {
    if (!game.user.isGM) return context;

    context.clocks = [];
    const clocks = this.isEditMode ? this.document.system.clocks.sourceContents : this.document.system.clocks;
    for (const clock of clocks) {
      if (this.isPlayMode) {
        context.clocks.push({
          clock: clock,
          disableUp: clock.isFull,
          disableDown: clock.isEmpty,
          name: clock.name ? clock.name : game.i18n.localize(clock.constructor.metadata.defaultName),
          hue: clock.color.rgb.map(k => k * 255).join(", "),
        });
      } else {
        const makeField = path => {
          const field = clock.schema.getField(path);
          const name = `system.clocks.${clock.id}.${path}`;
          return {
            field, name,
            value: foundry.utils.getProperty(clock, path) || null,
            source: foundry.utils.getProperty(clock._source, path),
          };
        };

        context.clocks.push({
          clock: clock,
          name: { ...makeField("name"), placeholder: game.i18n.localize(clock.constructor.metadata.defaultName) },
          value: makeField("value"),
          max: makeField("max"),
          color: { ...makeField("color"), placeholder: clock.constructor.metadata.color },
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
  async _onDropActor(document, target, changes) {
    const isMembers = this.tabGroups.primary === "members";
    if (!isMembers) return;
    this.document.system.addMember(document);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    for (const { actor } of this.document.system.members) {
      if (actor) actor.apps[this.id] = this;
    }

    this._createContextMenu(
      this._getClockEntryContextOptions,
      "progress-clock",
      "getClockContextOptions",
    );
  }

  /* -------------------------------------------------- */

  /**
   * Get context menu options for clocks.
   * @returns {ContextMenuEntry[]}
   */
  _getClockEntryContextOptions() {
    return [{
      name: "Edit Clock",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      callback: clock => {
        const id = clock.closest(".clock").dataset.id;
        clock = this.document.getEmbeddedDocument("Clock", id);
        clock.sheet.render({ force: true });
      },
      condition: clock => this.isEditable,
    }, {
      name: "Delete Clock",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      callback: clock => {
        const id = clock.closest(".clock").dataset.id;
        clock = this.document.getEmbeddedDocument("Clock", id);
        clock.delete();
      },
      condition: clock => this.isEditable,
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
    // TODO: This is copied wholesale from hero sheet.
    for (const item of html.querySelectorAll("inventory-item")) {
      const hidden = !!query && !item.dataset.name.toLowerCase().includes(query);
      item.classList.toggle("hidden", hidden);
    }
  }

  /* -------------------------------------------------- */

  /**
   * Change the currency of a party member.
   * @param {PointerEvent} event     The originating change event.
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
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #distributeCurrency(event, target) {
    this.document.system.distributeCurrencyDialog();
  }

  /* -------------------------------------------------- */

  /**
   * Display an actor when the avatar is clicked.
   * @this {PartySheet}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
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
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
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
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
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
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static async #recallMembers(event, target) {
    const token = this.document.isToken ? this.document.token?.object : this.document.getActiveTokens()[0];
    if (token) token.document.recallMembers();
  }

  /* -------------------------------------------------- */

  /**
   * Remove this member from this party.
   * @this {PartySheet}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
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
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #clockDelta(event, target) {
    const isUp = target.dataset.delta === "up";
    const id = target.closest(".clock").dataset.id;
    const clock = this.document.getEmbeddedDocument("Clock", id);
    if (isUp) clock.increase();
    else clock.decrease();
  }

  /* -------------------------------------------------- */

  /**
   * Create a new clock.
   * @this {PartySheet}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #addClock(event, target) {
    const type = target.dataset.clock;
    artichron.data.pseudoDocuments.clocks.BaseClock.create({ type }, { parent: this.document });
  }

  /* -------------------------------------------------- */

  /**
   * Remove a clock.
   * @this {PartySheet}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #removeClock(event, target) {
    const id = target.closest("[data-id]").dataset.id;
    this.document.getEmbeddedDocument("Clock", id).delete();
  }
}
