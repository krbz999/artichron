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
      advancementDialog: HeroSheet.#advancementDialog,
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
    const ctx = context.ctx = { path: {}, defenses: [] };

    // Path.
    const key = this.document.system.currentPaths[0];
    ctx.path.label = key in context.config.PROGRESSION_CORE_PATHS
      ? context.config.PROGRESSION_CORE_PATHS[key].label
      : context.config.PROGRESSION_MIXED_PATHS[key]?.label;

    // Damage.
    ctx.damage = {
      part: this.document.getEmbeddedPseudoDocumentCollection("Damage").contents[0],
    };

    // Defenses.
    for (const [k, v] of Object.entries(this.document.system.defenses)) {
      if (!v) continue;
      const { color, icon, label } = artichron.config.DAMAGE_TYPES[k];
      ctx.defenses.push({ color, icon, label, value: v });
    }

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
      favorites: [],
      skills: [],
    };

    // Favorites
    for (const item of this.document.favorites) {
      context.ctx.favorites.push({ document: item });
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
    // The sections and whether the hero is *currently* mixed path.
    context.ctx = { paths: {}, mixed: false, droparea: false };

    const paths = this.document.system.progression.paths;
    const [currentPath, primary, secondary] = this.document.system.currentPaths;

    const mixed = artichron.config.PROGRESSION_CORE_PATHS[primary]?.mixed[secondary];
    if (mixed) {
      context.ctx.paths[mixed] = {
        ...artichron.config.PROGRESSION_MIXED_PATHS[mixed],
        key: mixed,
        items: [],
      };
      context.ctx.mixed = currentPath === mixed;
    }

    for (const key of [primary, secondary]) {
      if (!key) continue;
      const config = artichron.config.PROGRESSION_CORE_PATHS[key];
      context.ctx.paths[key] = {
        ...config,
        ...paths[key],
        key,
        items: [],
        label: `${config.label} (${paths[key].invested})`,
      };
    }

    // Set full invested value for mixed path.
    if (mixed) {
      context.ctx.paths[mixed].invested = (paths[primary]?.invested ?? 0) + (paths[secondary]?.invested ?? 0);
      context.ctx.paths[mixed].label = `${context.ctx.paths[mixed].label} (${context.ctx.paths[mixed].invested})`;
    }

    // A temporary "misc" section to store unsorted talents. Removed if none found.
    context.ctx.paths.other = { items: [], label: game.i18n.localize("ARTICHRON.SHEET.HERO.HEADERS.otherTalents") };

    // Sort talents into path sections.
    for (const talent of this.document.items.documentsByType.talent) {
      const path = talent.getFlag("artichron", "advancement.path");
      let section = context.ctx.paths.other;
      section = context.ctx.paths[path] ?? section;
      section.items.push({ document: talent });
    }

    // If the hero is not currently mixed path and there are no talents from the mixed path either, remove that section.
    if (mixed && !context.ctx.mixed && !context.ctx.paths[mixed]?.items.length) delete context.ctx.paths[mixed];

    // Remove "other" section if empty.
    if (!context.ctx.paths.other.items.length) delete context.ctx.paths.other;

    context.ctx.droparea = !Object.keys(context.ctx.paths).some(k => k !== "other");
    context.ctx.paths = Object.values(context.ctx.paths);

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
      if (item.type === "talent") continue;
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
      if (!event.target.classList.contains("drop-target-area")) return;
      const id = item.system.identifier;
      if (!(id in artichron.config.PROGRESSION_CORE_PATHS)) {
        ui.notifications.error("ARTICHRON.ITEM.PATH.WARNING.invalidPath", { localize: true });
        return;
      }

      const { paths } = this.document.system.progression;

      // This drop area is only used if the actor has 0 paths.
      if (foundry.utils.isEmpty(paths)) await this.document.system.advanceDialog({ additional: [id] });
      return;
    }

    return super._onDropItem(event, item);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onDragOver(event) {
    const area = event.target.closest(".drop-target-area");
    if (!area) return super._onDragOver(event);
    if (area.classList.contains("dragover")) return;

    area.classList.add("dragover");
    area.addEventListener("dragleave", () => area.classList.remove("dragover"), { once: true });
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
   * Trigger advancement dialog.
   * @this {HeroSheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #advancementDialog(event, target) {
    this.document.system.advanceDialog();
  }
}
