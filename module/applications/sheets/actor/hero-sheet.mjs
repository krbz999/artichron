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
      template: "systems/artichron/templates/shared/sheet-header.hbs",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    attributes: {
      template: "systems/artichron/templates/sheets/actor/hero-sheet/attributes.hbs",
      scrollable: [".center-pane"],
    },
    inventory: {
      template: "systems/artichron/templates/sheets/actor/hero-sheet/inventory.hbs",
      classes: ["scrollable"],
      scrollable: [".scrollable"],
    },
    details: {
      template: "systems/artichron/templates/sheets/actor/hero-sheet/details.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
    effects: {
      template: "systems/artichron/templates/shared/effects.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
    encumbrance: {
      template: "systems/artichron/templates/sheets/actor/hero-sheet/encumbrance.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "attributes" },
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
  async _prepareContext(options) {
    const doc = this.document;
    const src = doc.toObject();
    const rollData = doc.getRollData();

    const effects = await this._prepareEffects();
    const [buffs, conditions] = effects.partition(e => e.effect.type === "condition");

    const context = {
      ...await super._prepareContext(options),
      document: doc,
      config: artichron.config,
      health: this.document.system.health,
      pools: this.#preparePools(),
      equipment: this.#prepareEquipment(),
      items: await this._prepareItems(),
      encumbrance: this.#prepareEncumbrance(),
      effects: buffs,
      conditions: conditions,
      isEditMode: this.isEditMode,
      isPlayMode: this.isPlayMode,
      isEditable: this.isEditable,
      searchQuery: this.#searchQuery,
    };

    const makeField = path => {
      const schema = path.startsWith("system") ? this.document.system.schema : this.document.schema;
      const field = path.startsWith("system") ? schema.getField(path.slice(7)) : schema.getField(path);
      const value = foundry.utils.getProperty(context.isEditMode ? this.document._source : this.document, path);
      return { field, value };
    };

    // Details tab.
    context.pips = makeField("system.pips.turn");
    const field = new foundry.data.fields.NumberField({
      label: "Compact Items",
      hint: "Toggle whether items are shown in a list or a grid.",
      choices: {
        0: "Expanded",
        1: "Compact",
      },
    });
    const value = this.document.flags.artichron?.compactItems ?? null;
    context.compactItems = {
      field: field,
      value: value,
    };

    const makeResistance = (key, path) => {
      context.defenses ??= {};
      const value = foundry.utils.getProperty(doc.system, path);
      context.defenses[key] = {
        value: value,
        label: artichron.config.DAMAGE_TYPES[key].label,
        color: artichron.config.DAMAGE_TYPES[key].color,
        icon: artichron.config.DAMAGE_TYPES[key].icon,
        active: value > 0,
      };
    };

    // Damage defenses.
    for (const k of Object.keys(doc.system.defenses)) {
      makeResistance(k, `defenses.${k}`);
    }
    context.defenses = Object.values(context.defenses);

    // Skills.
    context.skills = Object.entries(this.document.system.skills).map(([k, v]) => {
      const { label, img } = artichron.config.SKILLS[k];
      return { label, img, value: v.number, skillId: k };
    });

    // Name and img.
    context.header = {
      name: context.isPlayMode ? doc.name : src.name,
      img: context.isPlayMode ? doc.img : src.img,
    };

    // Details tab.
    context.notes = {
      field: this.document.system.schema.getField("details.notes"),
      value: foundry.utils.getProperty(this.document._source, "system.details.notes"),
      enriched: await foundry.applications.ux.TextEditor.enrichHTML(this.document.system.details.notes, {
        relativeTo: this.document, rollData: rollData,
      }),
    };

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare health, stamina, mana pools.
   * @returns {object[]}
   */
  #preparePools() {
    const pools = Object.entries(this.document.system.pools).map(([key, pool]) => ({ ...pool, key: key }));
    return pools;
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

  /**
   * Prepare encumbrance bar.
   * @returns {object}
   */
  #prepareEncumbrance() {
    const enc = this.document.system.encumbrance;
    return { ...enc, percent: Math.round(Math.clamp(enc.value / enc.max, 0, 1) * 100) };
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
    if (partId === "inventory") {
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
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #onRollSkill(event, target) {
    if (!this.isEditable) return;
    this.document.rollSkill({ event, base: target.dataset.skillId });
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to roll one of the pools.
   * @this {HeroSheet}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #onRollPool(event, target) {
    if (!this.isEditable) return;
    this.document.rollPool({ pool: target.dataset.pool, event });
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to change an equipped item in a particular slot.
   * @this {HeroSheet}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #onChangeEquipped(event, target) {
    if (!this.isEditable) return;
    const slot = target.closest("[data-equipment-slot]").dataset.equipmentSlot;
    this.document.system.changeEquippedDialog(slot);
  }
}
