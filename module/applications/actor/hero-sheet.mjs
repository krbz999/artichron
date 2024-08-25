import ActorSheetArtichron from "./actor-sheet-base.mjs";

export default class HeroSheet extends ActorSheetArtichron {

  /**
   * The current search query on the inventory tab.
   * @type {string}
   */
  #searchQuery = "";

  /* -------------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["hero"],
    position: {width: 510, height: 800},
    actions: {
      rollSkill: this.#onRollSkill,
      rollPool: this.#onRollPool,
      changeEquipped: this.#onChangeEquipped
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {template: "systems/artichron/templates/shared/sheet-header.hbs"},
    tabs: {template: "systems/artichron/templates/shared/tabs.hbs"},
    attributes: {
      template: "systems/artichron/templates/actor/tab-attributes.hbs",
      scrollable: [".center-pane"]
    },
    inventory: {
      template: "systems/artichron/templates/actor/tab-inventory.hbs",
      scrollable: [".inventory-list"]
    },
    details: {
      template: "systems/artichron/templates/actor/tab-details.hbs",
      scrollable: [""]
    },
    effects: {
      template: "systems/artichron/templates/shared/effects.hbs",
      scrollable: [""]
    },
    encumbrance: {template: "systems/artichron/templates/actor/tab-encumbrance.hbs"}
  };

  /* -------------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "attributes"
  };

  /* -------------------------------------------------- */

  /** @override */
  static TABS = {
    attributes: {id: "attributes", group: "primary", label: "ARTICHRON.SheetTab.Attributes"},
    inventory: {id: "inventory", group: "primary", label: "ARTICHRON.SheetTab.Inventory"},
    details: {id: "details", group: "primary", label: "ARTICHRON.SheetTab.Details"},
    effects: {id: "effects", group: "primary", label: "ARTICHRON.SheetTab.Effects"}
  };

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const doc = this.document;
    const src = doc.toObject();
    const rollData = doc.getRollData();

    const effects = await this._prepareEffects();
    const [buffs, conditions] = effects.partition(e => e.effect.type === "condition");

    const context = {
      document: doc,
      config: CONFIG.SYSTEM,
      health: this.document.system.health,
      pools: this.#preparePools(),
      equipment: this.#prepareEquipment(),
      items: await this._prepareItems(),
      encumbrance: this.#prepareEncumbrance(),
      effects: buffs,
      conditions: conditions,
      tabs: this._getTabs(),
      isEditMode: this.isEditMode,
      isPlayMode: this.isPlayMode,
      isEditable: this.isEditable,
      searchQuery: this.#searchQuery,
      pointsField1: new foundry.data.fields.NumberField({min: 0, step: 1, max: 20, initial: 0, nullable: false}),
      pointsField2: new foundry.data.fields.NumberField({min: 0, step: 1, max: 20, initial: 0, nullable: false})
    };

    const makeField = path => {
      const schema = path.startsWith("system") ? this.document.system.schema : this.document.schema;
      const field = path.startsWith("system") ? schema.getField(path.slice(7)) : schema.getField(path);
      const value = foundry.utils.getProperty(context.isEditMode ? this.document._source : this.document, path);
      return {field, value};
    };

    // Details tab.
    context.pips = makeField("system.pips.turn");
    const field = new foundry.data.fields.NumberField({
      label: "Compact Items",
      hint: "Toggle whether items are shown in a list or a grid.",
      choices: {
        0: "Expanded",
        1: "Compact"
      }
    });
    const value = this.document.flags.artichron?.compactItems ?? null;
    context.compactItems = {
      field: field,
      value: value
    };

    const makeResistance = (key, path) => {
      context.resistances ??= {};
      const value = foundry.utils.getProperty(doc.system, path);
      context.resistances[key] = {
        value: value,
        label: CONFIG.SYSTEM.DAMAGE_TYPES[key].label,
        color: CONFIG.SYSTEM.DAMAGE_TYPES[key].color,
        icon: CONFIG.SYSTEM.DAMAGE_TYPES[key].icon,
        active: value > 0
      };
    };

    // Armor and resistances.
    makeResistance("physical", "defenses.armor");
    for (const k of Object.keys(doc.system.resistances)) {
      makeResistance(k, `resistances.${k}`);
    }
    context.resistances = Object.values(context.resistances);

    // Skills.
    context.skills = Object.entries(this.document.system.skills).map(([k, v]) => {
      const {label, img} = CONFIG.SYSTEM.SKILLS[k];
      return {label, img, value: v.number, skillId: k};
    });

    // Name and img.
    context.header = {
      name: context.isPlayMode ? doc.name : src.name,
      img: context.isPlayMode ? doc.img : src.img
    };

    // Details tab.
    context.notes = {
      field: this.document.system.schema.getField("details.notes"),
      value: foundry.utils.getProperty(this.document._source, "system.details.notes"),
      enriched: await TextEditor.enrichHTML(this.document.system.details.notes, {
        relativeTo: this.document, rollData: rollData
      })
    };

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare health, stamina, mana pools.
   * @returns {object[]}
   */
  #preparePools() {
    const pools = Object.entries(this.document.system.pools).map(([key, pool]) => ({...pool, key: key}));
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
      boots: "icons/equipment/feet/boots-leather-engraved-brown.webp"
    };

    const equipped = [];

    const setup = (key, item) => {
      const data = {
        active: !!item,
        item: item ? item : {img: emptySlotIcons[key] ?? emptySlotIcons.arsenal},
        dataset: {equipmentSlot: key, action: "changeEquipped"}
      };
      if (item) data.dataset.itemUuid = item.uuid;
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

  /** @override */
  async _prepareItems() {
    const compact = this.document.getFlag("artichron", "compactItems") ?? game.settings.get("artichron", "compactItems");
    if (compact) {
      return [{
        label: "DOCUMENT.Items",
        classes: ["compact"],
        items: this.document.items.contents.sort((a, b) => a.sort - b.sort).map(item => ({item}))
      }];
    }

    const types = this.document.itemTypes;
    const sections = {
      arsenal: {
        label: "ARTICHRON.SheetTab.Arsenal",
        types: new Set()
      },
      gear: {
        label: "ARTICHRON.SheetTab.Gear",
        types: new Set()
      },
      consumables: {
        label: "ARTICHRON.SheetTab.Consumables",
        types: new Set()
      },
      loot: {
        label: "ARTICHRON.SheetTab.Loot",
        types: new Set()
      }
    };

    for (const [type, Cls] of Object.entries(CONFIG.Item.dataModels)) {
      sections[Cls.metadata.inventorySection].types.add(type);
    }

    const tabs = [];
    for (const [k, v] of Object.entries(sections)) {
      const section = {label: v.label, id: k, items: []};
      for (const t of v.types) {
        for (const item of types[t]) {
          const expanded = this._expandedItems.has(item.uuid);
          const data = {
            item: item,
            enriched: expanded ? await TextEditor.enrichHTML(item.system.description.value, {
              relativeTo: item, rollData: item.getRollData()
            }) : null
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
    return {...enc, percent: Math.round(Math.clamp(enc.value / enc.max, 0, 1) * 100)};
  }

  /* -------------------------------------------------- */

  /** @override */
  _preSyncPartState(p, ne, pe, s) {
    super._preSyncPartState(p, ne, pe, s);

    if (p === "attributes") {
      const o = pe.querySelector(".health-bar");
      s.healthHeight = Math.max(o.offsetTop, 0);
    }
  }

  /* -------------------------------------------------- */

  /** @override */
  _syncPartState(partId, newElement, priorElement, state) {
    super._syncPartState(partId, newElement, priorElement, state);

    if (partId === "attributes") {
      if (!("healthHeight" in state)) return;
      const newBar = newElement.querySelector(".health-bar");
      const n = Math.max(newBar.offsetTop, 0);
      if (state.healthHeight === n) return;
      const frames = [{top: `${state.healthHeight}px`}, {top: `${n}px`}];
      newBar.animate(frames, {duration: 1000, easing: "ease-in-out"});
    }

    else if (partId === "encumbrance") {
      const oldBar = priorElement.querySelector(".encumbrance .bar");
      const newBar = newElement.querySelector(".encumbrance .bar");
      const frames = [{width: oldBar.style.width}, {width: newBar.style.width}];
      newBar.animate(frames, {duration: 1000, easing: "ease-in-out"});
    }

    else if (partId === "inventory") {
      this.#onSearchFilter(this.#searchQuery, newElement);
    }
  }

  /* -------------------------------------------------- */

  /** @override */
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
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static #onRollSkill(event, target) {
    if (!this.isEditable) return;
    this.document.rollSkill({base: target.dataset.skillId});
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to roll one of the pools.
   * @this {HeroSheet}
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static #onRollPool(event, target) {
    if (!this.isEditable) return;
    this.document.rollPool(target.dataset.pool, {event});
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to change an equipped item in a particular slot.
   * @this {HeroSheet}
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static #onChangeEquipped(event, target) {
    if (!this.isEditable) return;
    const slot = target.closest("[data-equipment-slot]").dataset.equipmentSlot;
    this.document.system.changeEquippedDialog(slot);
  }
}
