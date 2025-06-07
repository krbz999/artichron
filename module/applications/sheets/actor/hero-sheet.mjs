import ActorSheetArtichron from "./actor-sheet-base.mjs";

export default class HeroSheet extends ActorSheetArtichron {

  /**
   * The current search query on the inventory tab.
   * @type {string}
   */
  #searchQuery = "";

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["hero"],
    position: { width: 400 },
    actions: {
      rollPool: HeroSheet.#onRollPool,
      rollSkill: HeroSheet.#onRollSkill,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    header: {
      template: "systems/artichron/templates/sheets/actor/hero/header.hbs",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    health: {
      template: "systems/artichron/templates/sheets/actor/hero/health.hbs",
      classes: ["health-bar"],
    },
    attributes: {
      template: "systems/artichron/templates/sheets/actor/hero/attributes.hbs",
      classes: ["scrollable"],
      scrollable: [".sections.scrollable"],
    },
    progression: {
      template: "systems/artichron/templates/sheets/actor/hero/progression.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
    inventory: {
      template: "systems/artichron/templates/sheets/actor/hero/inventory.hbs",
      classes: ["scrollable"],
      scrollable: [".document-list-entries.scrollable"],
    },
    details: {
      template: "systems/artichron/templates/sheets/actor/hero/details.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
    effects: {
      template: "systems/artichron/templates/sheets/actor/hero/effects.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
    encumbrance: {
      template: "systems/artichron/templates/sheets/actor/hero/encumbrance.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "attributes", icon: "fa-solid fa-fw fa-clover" },
        { id: "progression", icon: "fa-solid fa-fw fa-circle-nodes" },
        { id: "inventory", icon: "fa-solid fa-fw fa-boxes" },
        { id: "details", icon: "fa-solid fa-fw fa-pen-fancy" },
        { id: "effects", icon: "fa-solid fa-fw fa-bolt" },
      ],
      labelPrefix: "ARTICHRON.SHEET.TABS",
      initial: "attributes",
    },
  };

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextHeader(context, options) {
    context.ctx = {};
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextTabs(context, options) {
    context.verticalTabs = true;
    context.ctx = {};
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextHealth(context, options) {
    context.ctx = {};
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextAttributes(context, options) {
    context.ctx = {
      health: this.document.system.health,
      pools: [],
      favorites: [],
      defenses: [],
      skills: [],
    };

    // Pools
    for (const [k, v] of Object.entries(this.document.system.pools)) {
      context.ctx.pools.push({ ...v, key: k });
    }

    // Favorites
    for (const item of this.document.favorites) {
      context.ctx.favorites.push({ document: item });
    }

    // Defenses
    for (const [k, v] of Object.entries(this.document.system.defenses)) {
      context.ctx.defenses.push({
        ...artichron.config.DAMAGE_TYPES[k],
        value: v,
        active: v > 0,
      });
    }

    // Skill
    for (const [k, v] of Object.entries(this.document.system.skills)) {
      context.ctx.skills.push({
        ...artichron.config.SKILLS[k],
        value: v.number,
        skillId: k,
      });
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextProgression(context, options) {
    context.ctx = { paths: [], mixed: null };

    const pathKeys = Object.keys(this.document.system.paths);
    const investedTotal = pathKeys.reduce((acc, k) => acc + this.document.system.paths[k].invested, 0);
    const mixedKey = artichron.config.PROGRESSION_CORE_PATHS[pathKeys[0]]?.mixed[pathKeys[1]];

    // The lowest invested path
    const [lowest] = pathKeys.sort((a, b) =>
      this.document.system.paths[a].invested - this.document.system.paths[b].invested,
    );

    const isMixed = !!mixedKey
      && pathKeys.some(k => this.document.system.paths[k].invested > artichron.config.PROGRESSION_VALUES.absolute)
      && (this.document.system.paths[lowest].invested / investedTotal * 100).between(
        artichron.config.PROGRESSION_VALUES.relative.lower,
        artichron.config.PROGRESSION_VALUES.relative.upper,
      );

    if (isMixed) {
      context.ctx.mixed = {
        ...artichron.config.PROGRESSION_MIXED_PATHS[mixedKey],
        key: mixedKey,
      };
    }

    for (const [i, key] of pathKeys.reverse().entries()) {
      context.ctx.paths.push({
        ...artichron.config.PROGRESSION_CORE_PATHS[key],
        ...this.document.system.paths[key],
        key,
        cssClass: isMixed || (i > 0) ? "inactive" : "",
        items: [],
      });
    }

    for (const talent of this.document.items.documentsByType.talent) {
      const path = talent.getFlag("artichron", "advancement.path");
      context.ctx.paths.find(p => p.key === path)?.items.push({ document: talent });
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextInventory(context, options) {
    context.ctx = {
      items: [],
      searchQuery: this.#searchQuery,
    };

    for (const item of this.document.items) {
      if (item.type === "path") continue;
      if (item.type === "talent") {
        const path = item.getFlag("artichron", "advancement.path");
        if (path && (path in this.document.system.paths)) continue;
      }
      context.ctx.items.push({ document: item, dataset: { name: item.name } });
    }
    context.ctx.items.sort((a, b) => artichron.utils.nameSort(a, b, "document"));

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextDetails(context, options) {
    context.ctx = {
      bio: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.document.system.biography.value,
        { relativeTo: this.document, rollData: this.document.getRollData() },
      ),
    };
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextEncumbrance(context, options) {
    const enc = this.document.system.encumbrance;
    context.ctx = {
      encumbrance: Math.round(Math.clamp(enc.value / enc.max, 0, 1) * 100),
    };
    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _preSyncPartState(p, ne, pe, s) {
    super._preSyncPartState(p, ne, pe, s);

    if (p === "health") {
      const o = pe.querySelector(".health-fill");
      s.healthHeight = Math.max(o.offsetTop, 0);
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _syncPartState(partId, newElement, priorElement, state) {
    super._syncPartState(partId, newElement, priorElement, state);

    if (partId === "health") {
      if (!("healthHeight" in state)) return;
      const newBar = newElement.querySelector(".health-fill");
      const n = Math.max(newBar.offsetTop, 0);
      if (state.healthHeight === n) return;
      const frames = [{ top: `${state.healthHeight}px` }, { top: `${n}px` }];
      newBar.animate(frames, { duration: 1000, easing: "ease-in-out" });
    }

    else if (partId === "encumbrance") {
      const oldBar = priorElement.querySelector(".encumbrance .bar");
      const newBar = newElement.querySelector(".encumbrance .bar");
      const frames = [{ width: oldBar.style.width }, { width: newBar.style.width }];
      newBar.animate(frames, { duration: 1000, easing: "ease-in-out" });
    }

    else if (partId === "inventory") {
      this.#onSearchFilter(this.#searchQuery, newElement);
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);

    switch (partId) {
      case "health":
        this.#attachPartListenersHealth(htmlElement, options);
        break;
      case "inventory":
        this.#attachPartListenersInventory(htmlElement, options);
        break;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Attach event listeners to a specific part.
   * @param {HTMLElement} element   The part element.
   * @param {object} options        Rendering options
   */
  #attachPartListenersHealth(element, options) {}

  /* -------------------------------------------------- */

  /**
   * Attach event listeners to a specific part.
   * @param {HTMLElement} element   The part element.
   * @param {object} options        Rendering options
   */
  #attachPartListenersInventory(element, options) {
    const input = element.querySelector("#inventory-search");
    const callback = foundry.utils.debounce(this.#onSearchFilter, 200).bind(this);
    input.addEventListener("input", event => {
      const query = event.currentTarget.value.toLowerCase().trim();
      this.#searchQuery = query;
      callback(query, element);
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onDropItem(event, item) {
    if (!this.document.isOwner) return;

    if (item.type === "path") {
      const { paths } = this.document.system;
      const allowed = (item.system.identifier in paths) || (Object.keys(paths).length < 2);
      if (!allowed) {
        ui.notifications.error("ARTICHRON.ITEM.PATH.WARNING.cannotAddNewPath", { localize: true });
        return;
      }
    }

    return super._onDropItem(event, item);
  }

  /* -------------------------------------------------- */
  /*   Event Handlers                                   */
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
   * Handle click events to roll a skill.
   * @this {HeroSheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #onRollSkill(event, target) {
    this.document.rollSkill({ event, base: target.dataset.skillId });
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to roll one of the pools.
   * @this {HeroSheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #onRollPool(event, target) {
    this.document.rollPool({ pool: target.dataset.pool, event });
  }
}
