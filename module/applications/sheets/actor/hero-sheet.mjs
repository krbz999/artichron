import ItemArtichron from "../../../documents/item.mjs";
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
    position: { width: 510, height: 800 },
    actions: {
      changeEquipped: HeroSheet.#onChangeEquipped,
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
    attributes: {
      template: "systems/artichron/templates/sheets/actor/hero/attributes.hbs",
      scrollable: [".center-pane"],
    },
    progression: {
      template: "systems/artichron/templates/sheets/actor/hero/progression.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
    inventory: {
      template: "systems/artichron/templates/sheets/actor/hero/inventory.hbs",
      classes: ["scrollable"],
      scrollable: [".scrollable"],
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
        { id: "attributes" },
        { id: "progression" },
        { id: "inventory" },
        { id: "details" },
        { id: "effects" },
      ],
      initial: "attributes",
      labelPrefix: "ARTICHRON.SHEET.TABS",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    const fn = `_preparePartContext${partId.capitalize()}`;
    if (!(this[fn] instanceof Function)) {
      throw new Error(`The ${this.constructor.name} sheet does not implement the ${fn} method.`);
    }

    return this[fn](context, options);
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for a part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<object>}
   */
  async _preparePartContextHeader(context, options) {
    context.ctx = {};
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for a part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<object>}
   */
  async _preparePartContextTabs(context, options) {
    context.ctx = {};
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for a part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<object>}
   */
  async _preparePartContextAttributes(context, options) {
    context.ctx = {
      health: this.document.system.health,
      pools: [],
      defenses: [],
      skills: [],
    };

    for (const [k, v] of Object.entries(this.document.system.pools)) {
      context.ctx.pools.push({ ...v, key: k });
    }

    for (const [k, v] of Object.entries(this.document.system.defenses)) {
      context.ctx.defenses.push({
        ...artichron.config.DAMAGE_TYPES[k],
        value: v,
        active: v > 0,
      });
    }

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

  /**
   * Prepare context for a part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<object>}
   */
  async _preparePartContextProgression(context, options) {
    context.ctx = { paths: [], mixed: null };

    const pathKeys = Object.keys(this.document.system.paths);
    const investedTotal = pathKeys.reduce((acc, k) => acc + this.document.system.paths[k].invested, 0);
    const mixedKey = artichron.config.PROGRESSION_CORE_PATHS[pathKeys[0]].mixed[pathKeys[1]];

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
      });
    }

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for a part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<object>}
   */
  async _preparePartContextInventory(context, options) {
    context.ctx = {
      equipment: this.#prepareEquipment(),
      items: await this._prepareItems(),
      searchQuery: this.#searchQuery,
    };
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for a part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<object>}
   */
  async _preparePartContextDetails(context, options) {
    context.ctx = {
      notes: await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.document.system.details.notes, {
        relativeTo: this.document, rollData: this.document.getRollData(),
      }),
    };
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for a part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<object>}
   */
  async _preparePartContextEffects(context, options) {
    context.ctx = {
      conditions: [],
      buffs: { active: [], inactive: [] },
    };

    for (const effect of this.document.allApplicableEffects()) {
      const data = { effect };
      if (effect.type === "condition") context.ctx.conditions.push(data);
      else if ((effect.type === "buff") && effect.disabled) context.ctx.buffs.inactive.push(data);
      else if (effect.type === "buff") context.ctx.buffs.active.push(data);
    }

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare context for a part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<object>}
   */
  async _preparePartContextEncumbrance(context, options) {
    const enc = this.document.system.encumbrance;
    context.ctx = {
      encumbrance: Math.round(Math.clamp(enc.value / enc.max, 0, 1) * 100),
    };
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare equipped items for rendering.
   * @returns {object[]}
   */
  #prepareEquipment() {
    const [primary, secondary] = Object.values(this.document.arsenal);

    const emptySlotIcons = {
      arsenal: "icons/weapons/axes/axe-broad-brown.webp",
      head: "icons/equipment/head/helm-barbute-brown-tan.webp",
      chest: "icons/equipment/chest/breastplate-leather-brown-belted.webp",
      arms: "icons/equipment/hand/glove-ringed-cloth-brown.webp",
      legs: "icons/equipment/leg/pants-breeches-leather-brown.webp",
      accessory: "icons/equipment/neck/choker-simple-bone-fangs.webp",
      boots: "icons/equipment/feet/boots-leather-engraved-brown.webp",
    };

    const equipped = [];

    const setup = (key, item) => {
      const data = {
        active: !!item,
        item: item ? item : { img: emptySlotIcons[key] ?? emptySlotIcons.arsenal },
        dataset: { equipmentSlot: key, action: "changeEquipped" },
      };
      if (item) {
        data.dataset.itemUuid = item.uuid;
        data.tooltip = `<section class="loading" data-uuid="${item.uuid}">
          <i class="fas fa-spinner fa-spin-pulse"></i>
        </section>`;
      }
      equipped.push(data);
    };

    // Arsenal.
    setup("primary", primary);
    if (!primary || !primary.isTwoHanded) setup("secondary", secondary);

    // Armor.
    for (const [key, item] of Object.entries(this.document.armor)) setup(key, item);

    return equipped;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareItems() {
    const compact = this.document.getFlag("artichron", "compactItems") ?? game.settings.get("artichron", "compactItems");
    if (compact) {
      return [{
        label: "DOCUMENT.Items",
        classes: ["compact"],
        items: this.document.items.contents.sort((a, b) => a.sort - b.sort).map(item => ({ item })),
      }];
    }

    const types = this.document.itemTypes;
    const sections = {
      arsenal: {
        label: "ARTICHRON.HERO.INVENTORY.arsenal",
        types: new Set(),
      },
      gear: {
        label: "ARTICHRON.HERO.INVENTORY.gear",
        types: new Set(),
      },
      consumables: {
        label: "ARTICHRON.HERO.INVENTORY.consumables",
        types: new Set(),
      },
      loot: {
        label: "ARTICHRON.HERO.INVENTORY.loot",
        types: new Set(),
      },
    };

    for (const [type, Cls] of Object.entries(CONFIG.Item.dataModels)) {
      sections[Cls.metadata.inventorySection].types.add(type);
    }

    const tabs = [];
    for (const [k, v] of Object.entries(sections)) {
      const section = { label: v.label, id: k, items: [] };
      for (const t of v.types) {
        for (const item of types[t]) {
          const expanded = this._expandedItems.has(item.uuid);
          const data = {
            item: item,
            enriched: expanded ? await foundry.applications.ux.TextEditor.enrichHTML(item.system.description.value, {
              relativeTo: item, rollData: item.getRollData(),
            }) : null,
          };
          section.items.push(data);
        }
        section.items.sort((a, b) => {
          const sort = a.item.sort - b.item.sort;
          if (sort) return sort;
          return a.item._source.name.localeCompare(b.item._source.name);
        });
      }
      tabs.push(section);
    }
    return tabs;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _preSyncPartState(p, ne, pe, s) {
    super._preSyncPartState(p, ne, pe, s);

    if (p === "attributes") {
      const o = pe.querySelector(".health-bar");
      s.healthHeight = Math.max(o.offsetTop, 0);
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _syncPartState(partId, newElement, priorElement, state) {
    super._syncPartState(partId, newElement, priorElement, state);

    if (partId === "attributes") {
      if (!("healthHeight" in state)) return;
      const newBar = newElement.querySelector(".health-bar");
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
    if (item.type === "path") return this.#onDropPath(item);
    return super._onDropItem(event, item);
  }

  /* -------------------------------------------------- */

  /**
   * Implement drop handling of a Path item onto the sheet.
   * @param {ItemArtichron} item   The path item.
   */
  async #onDropPath(item) {
    const { paths } = this.document.system;
    const identifier = item.system.identifier;

    const picked = identifier in paths;

    const allowed = picked || (Object.keys(paths).length < 2);
    if (!allowed) {
      ui.notifications.error("ARTICHRON.ITEM.PATH.WARNING.cannotAddNewPath", { localize: true });
      return;
    }

    // A path that has already been picked is dropped onto the sheet again.
    if (picked) {
      const confirm = await artichron.applications.api.Dialog.confirm({});
      if (!confirm) return;
      throw new Error("TODO: Do things when an existing path is dropped again.");
    }

    // A path that has not yet been picked is dropped onto the sheet.
    this.document.update({ [`system.paths.${identifier}`]: { advancements: [0] } });
    // TODO: do more
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
    for (const item of html.querySelectorAll("inventory-item")) {
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
    if (!this.isEditable) return;
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
    if (!this.isEditable) return;
    this.document.rollPool({ pool: target.dataset.pool, event });
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to change an equipped item in a particular slot.
   * @this {HeroSheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #onChangeEquipped(event, target) {
    if (!this.isEditable) return;
    const slot = target.closest("[data-equipment-slot]").dataset.equipmentSlot;
    this.document.system.changeEquippedDialog(slot);
  }
}
