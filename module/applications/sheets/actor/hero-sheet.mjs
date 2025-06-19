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
      scrollable: [""],
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
    const ctx = context.ctx = { path: {}, defenses: [], skills: [] };

    // Path.
    ctx.path.label = this.document.system.progression.label ?? "";

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

    // Skills.
    for (const [k, v] of Object.entries(artichron.config.SKILLS)) {
      const { label, img } = v;
      const { formula } = this.document.system.skills[k];
      ctx.skills.push({
        formula, img, label,
        skillId: k,
      });
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
    const ctx = context.ctx = { favorites: [] };

    // Favorites
    for (const item of this.document.favorites) {
      ctx.favorites.push({ document: item, classes: ["draggable"] });
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextProgression(context, options) {
    // The sections and whether the hero is *currently* mixed path.
    const ctx = context.ctx = {
      paths: {},
      droparea: false,
    };

    const { primaryPath, secondaryPath, mixedPath, invested, isMixed } = this.document.system.progression;

    if (mixedPath) {
      ctx.paths[mixedPath.identifier] = {
        path: mixedPath,
        label: `${mixedPath.name} (${invested[mixedPath.identifier]})`,
        items: [],
      };
    }

    for (const path of [primaryPath, secondaryPath]) {
      if (!path) continue;
      context.ctx.paths[path.identifier] = {
        path,
        label: `${path.name} (${invested[path.identifier]})`,
        items: [],
      };
    }

    // A temporary "misc" section to store unsorted talents. Removed if none found.
    ctx.paths.other = { items: [], label: game.i18n.localize("ARTICHRON.SHEET.HERO.HEADERS.otherTalents") };

    // Sort talents into path sections.
    for (const talent of this.document.items.documentsByType.talent) {
      const path = talent.getFlag("artichron", "advancement.path");
      let section = ctx.paths.other;
      section = ctx.paths[path] ?? section;
      section.items.push({ document: talent, classes: ["draggable"] });
    }

    // If the hero is not currently mixed path and there are no talents from the mixed path either, remove that section.
    if (!isMixed && !ctx.paths[mixedPath?.identifier]?.items.length) delete ctx.paths[mixedPath?.identifier];

    // Remove "other" section if empty.
    if (!ctx.paths.other.items.length) delete ctx.paths.other;

    ctx.droparea = !Object.keys(ctx.paths).some(k => k !== "other");
    ctx.paths = Object.values(ctx.paths);

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextInventory(context, options) {
    const ctx = context.ctx = {
      items: [],
      searchQuery: this.#searchQuery,
    };

    // Encumbrance.
    const enc = this.document.system.encumbrance;
    ctx.encumbrance = Math.round(Math.clamp(enc.value / enc.max, 0, 1) * 100);

    // Inventory.
    for (const item of this.document.items) {
      if (item.type === "path") continue;
      if (item.type === "talent") continue;
      ctx.items.push({ document: item, dataset: { name: item.name }, classes: ["draggable"] });
    }
    ctx.items.sort((a, b) => artichron.utils.nameSort(a, b, "document"));

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

    else if (partId === "inventory") {
      // Restore search.
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
