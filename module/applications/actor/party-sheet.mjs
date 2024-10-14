import ChatMessageArtichron from "../../documents/chat-message.mjs";
import ActorSheetArtichron from "./actor-sheet-base.mjs";
import PartyFundsDialog from "./party-funds-dialog.mjs";

export default class PartySheet extends ActorSheetArtichron {
  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["party"],
    position: {width: 650},
    actions: {
      addClock: PartySheet.#addClock,
      clockDelta: PartySheet.#clockDelta,
      createProgression: PartySheet.#createProgression,
      displayActor: PartySheet.#displayActor,
      distributeCurrency: PartySheet.#distributeCurrency,
      distributePoints: PartySheet.#distributePoints,
      manageFunds: PartySheet.#manageFunds,
      placeMembers: PartySheet.#placeMembers,
      recallMembers: PartySheet.#recallMembers,
      removeClock: PartySheet.#removeClock,
      removeMember: PartySheet.#removeMember
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {template: "systems/artichron/templates/shared/sheet-header.hbs"},
    tabs: {template: "systems/artichron/templates/shared/tabs.hbs"},
    members: {
      template: "systems/artichron/templates/actor/party-members.hbs",
      scrollable: [""]
    },
    inventory: {
      template: "systems/artichron/templates/actor/party-inventory.hbs",
      scrollable: [""]
    },
    progress: {
      template: "systems/artichron/templates/actor/party-progress.hbs",
      scrollable: [""]
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  static TABS = {
    members: {id: "members", group: "primary", label: "ARTICHRON.SheetLabels.Members"},
    inventory: {id: "inventory", group: "primary", label: "ARTICHRON.SheetLabels.Inventory"},
    progress: {id: "progress", group: "primary", label: "ARTICHRON.SheetLabels.Progress"}
  };

  /* -------------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "members"
  };

  /* -------------------------------------------------- */
  /*   Rendering methods                                */
  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = {
      isEditable: this.isEditable,
      isEditMode: this.isEditMode,
      isPlayMode: this.isPlayMode,
      document: this.document,
      isGM: game.user.isGM
    };
    return context;
  }

  /* -------------------------------------------------- */

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    switch (partId) {
      case "header":
        return this.#preparePartContextHeader(context, options);
      case "tabs":
        return this.#preparePartContextTabs(context, options);
      case "members":
        return this.#preparePartContextMembers(context, options);
      case "inventory":
        return this.#preparePartContextInventory(context, options);
      case "progress":
        return this.#preparePartContextProgress(context, options);
      default:
        throw new Error(`'${partId}' is not a valid part for the Party Sheet!`);
    }
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
      name: prop("name")
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
  async #preparePartContextTabs(context, options) {
    context.tabs = this._getTabs();
    if (!game.user.isGM) delete context.tabs.progress;
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

    for (const {actor} of this.document.system.members) {
      if (!actor) continue;
      const context = {
        actor: actor,
        isOwner: actor.isOwner,
        isHero: actor.type === "hero",
        isMonster: actor.type === "monster",
        pct: {hp: actor.system.health.pct},
        canView: actor.testUserPermission(game.user, "LIMITED"),
        canManage: actor.isOwner && this.document.isOwner
      };

      if (context.isHero) {
        context.pct.health = actor.system.pools.health.pct;
        context.pct.stamina = actor.system.pools.stamina.pct;
        context.pct.mana = actor.system.pools.mana.pct;

        context.pts = {
          available: actor.system.progression.points.available,
          total: actor.system.progression.points.total,
          spent: actor.system.progression.points.total - actor.system.progression.points.available
        };
      } else if (context.isMonster) {
        context.pct.danger = actor.system.danger.pool.pct;
      }

      members.push(context);
    }

    const distributions = {
      currency: {
        value: this.document.system.currency.award,
        disabled: !game.user.isGM || !this.document.system.currency.award || !this.isEditable
      },
      points: {
        value: this.document.system.points.value,
        disabled: !game.user.isGM || !this.document.system.points.value || !this.isEditable
      }
    };

    context.funds = {
      value: this.document.system.currency.funds
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
        items: []
      };
      items[item.type].items.push(item);
    }

    for (const {items: itemArray} of Object.values(items)) {
      itemArray.sort((a, b) => {
        const sort = a.sort - b.sort;
        if (sort) return sort;
        return a.name.localeCompare(b.name);
      });
    }

    context.items = Object.fromEntries(Object.entries(items).sort((a, b) => {
      return a[1].order - b[1].order;
    }));

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
    for (const clock of this.document.system.clocks) {
      if (this.isPlayMode) context.clocks.push({
        clock: clock,
        disableUp: !(clock.value < clock.max),
        disableDown: !(clock.value > 0),
        name: clock.name ? clock.name : game.i18n.localize("ARTICHRON.CLOCK.FIELDS.name.initial"),
        hue: clock.color.rgb.map(k => k * 255).join(", ")
      });
      else {
        const makeField = path => {
          const field = clock.schema.getField(path);
          const name = `system.clocks.${clock.id}.${path}`;
          return {field: field, name: name, value: foundry.utils.getProperty(clock, path)};
        };

        context.clocks.push({
          clock: clock,
          name: makeField("name"),
          value: makeField("value"),
          max: makeField("max"),
          color: makeField("color")
        });
      }
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @override */
  _canDragStart(selector) {
    return this.isEditable && this.document.isOwner;
  }

  /* -------------------------------------------------- */

  /** @override */
  async _onDropActor(document, target, changes) {
    const isMembers = this.tabGroups.primary === "members";
    if (!isMembers) return;
    this.document.system.addMember(document);
  }

  /* -------------------------------------------------- */

  /** @override */
  _onFirstRender(context, options) {
    super._onFirstRender(context, options);
    for (const {actor} of this.document.system.members) {
      if (actor) actor.apps[this.id] = this;
    }
  }

  /* -------------------------------------------------- */

  /** @override */
  _onClose(options) {
    for (const {actor} of this.document.system.members) {
      if (actor) delete actor.apps[this.id];
    }
    super._onClose(options);
  }

  /* -------------------------------------------------- */

  /** @override */
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);

    if (partId === "members") {
      htmlElement.querySelectorAll("[data-change=changeCurrency]").forEach(input => {
        input.addEventListener("change", this.#changeCurrency.bind(this));
      });
    }
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Change the currency of a party member.
   * @param {PointerEvent} event     The originating change event.
   */
  #changeCurrency(event) {
    const id = event.currentTarget.closest("[data-id]").dataset.id;
    const actor = this.document.system.members.find(m => m.actor.id === id).actor;
    const result = artichron.utils.parseInputDelta(event.currentTarget, actor);
    if (result !== undefined) actor.update({"system.currency.funds": result});
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
   * Prompt to distribute to the party an amount of progression points.
   * @this {PartySheet}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #distributePoints(event, target) {
    this.document.system.distributePointsDialog();
  }

  /* -------------------------------------------------- */

  /**
   * Prompt to create a progression on a hero actor who is a member of this party.
   * @this {PartySheet}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #createProgression(event, target) {
    const id = target.closest(".member").dataset.id;
    const actor = game.actors.get(id);
    actor.system.createProgression();
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
    actor.sheet.render({force: true});
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
    const config = await PartyFundsDialog.create({party: this.document, member: actor});
    if (!config || !(config.amount > 0)) return;
    const path = "system.currency.funds";

    // Current values
    const af = foundry.utils.getProperty(actor, path);
    const pf = foundry.utils.getProperty(this.document, path);

    // New values
    const av = config.deposit ? af - config.amount : af + config.amount;
    const pv = config.deposit ? pf + config.amount : pf - config.amount;

    if (av < 0) {
      ui.notifications.warn("ARTICHRON.PartyFundsDialog.InsufficientMemberFunds", {localize: true});
      return;
    }

    if (pv < 0) {
      ui.notifications.warn("ARTICHRON.PartyFundsDialog.InsufficientPartyFunds", {localize: true});
      return;
    }

    Promise.all([
      actor.update({[path]: av}),
      this.document.update({[path]: pv}),
      ChatMessageArtichron.create({
        speaker: ChatMessageArtichron.getSpeaker({actor: this.document}),
        content: game.i18n.format(`ARTICHRON.PartyFundsDialog.Receipt${config.deposit ? "Deposit" : "Withdraw"}`, {
          name: actor.name, amount: config.amount
        })
      })
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
    const id = target.dataset.id;
    const clock = this.document.system.clocks.get(id);
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
    const clocks = this.document.system.clocks;
    const type = event.shiftKey ? "bad" : "good";
    clocks.createClock({type: type});
  }

  /* -------------------------------------------------- */

  /**
   * Remove a clock.
   * @this {PartySheet}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #removeClock(event, target) {
    const clocks = this.document.system.clocks;
    const id = target.closest("[data-id]").dataset.id;
    clocks.deleteClock(id);
  }
}
