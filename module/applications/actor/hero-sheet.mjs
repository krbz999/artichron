import EquipDialog from "../item/equip-dialog.mjs";
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
    position: {width: 550, top: 100, left: 200},
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
    equipment: {
      template: "systems/artichron/templates/actor/tab-equipment.hbs",
      scrollable: [""]
    },
    inventory: {
      template: "systems/artichron/templates/actor/tab-inventory.hbs",
      scrollable: [".inventory-list"]
    },
    effects: {
      template: "systems/artichron/templates/shared/effects.hbs",
      scrollable: [""]
    },
    details: {
      template: "systems/artichron/templates/actor/tab-details.hbs",
      classes: ["standard-form"],
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
    equipment: {id: "equipment", group: "primary", label: "ARTICHRON.SheetTab.Equipment"},
    inventory: {id: "inventory", group: "primary", label: "ARTICHRON.SheetTab.Inventory"},
    effects: {id: "effects", group: "primary", label: "ARTICHRON.SheetTab.Effects"},
    details: {id: "details", group: "primary", label: "ARTICHRON.SheetTab.Details"}
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
      equipment: await this.#prepareEquipment(),
      items: await this._prepareItems(),
      encumbrance: this.#prepareEncumbrance(),
      effects: buffs,
      conditions: conditions,
      tabs: this._getTabs(),
      isEditMode: this.isEditMode,
      isPlayMode: this.isPlayMode,
      isEditable: this.isEditable,
      searchQuery: this.#searchQuery
    };

    const makeResistance = (key, path) => {
      context.resistances ??= {};
      const value = foundry.utils.getProperty(context.isEditMode ? src.system : doc.system, path);
      context.resistances[key] = {
        field: doc.system.schema.getField(path),
        value: context.isPlayMode ? (value ?? 0) : (value ? value : null),
        label: CONFIG.SYSTEM.DAMAGE_TYPES[key].label,
        color: CONFIG.SYSTEM.DAMAGE_TYPES[key].color,
        icon: CONFIG.SYSTEM.DAMAGE_TYPES[key].icon,
        active: context.isEditMode || !!value
      };
    };

    // Armor and resistances.
    makeResistance("physical", "defenses.armor.value");
    for (const k of Object.keys(doc.system.resistances)) {
      makeResistance(k, `resistances.${k}.value`);
    }
    context.resistances = Object.values(context.resistances);

    // Skills.
    context.skills = Object.entries(doc.system.skills).reduce((acc, [k, v]) => {
      const c = CONFIG.SYSTEM.SKILLS[k];
      const value = context.isEditMode ? src.system.skills[k].value : v.value;
      const data = {
        pips: Array(Math.min(10, value)).fill({}),
        skillId: k,
        label: c.label
      };

      if (context.isEditMode) {
        data.value = value || null;
        data.field = doc.system.schema.getField(`skills.${k}.value`);
      } else {
        data.value = value ? value : "&ndash;";
      }

      acc[c.group].push(data);
      return acc;
    }, {mind: [], body: [], soul: []});
    Object.values(context.skills).forEach(v => v.sort((a, b) => a.label.localeCompare(b.label)));

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
   * @returns {Promise<object[]>}
   */
  async #prepareEquipment() {
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

    const orders = {
      head: 1,
      chest: 2,
      legs: 3,
      accessory: 4,
      arms: 5,
      boots: 6
    };

    const equipped = {
      arsenal: {},
      armor: {}
    };

    const setup = async (key, column, item, order = 0) => {
      if (!item) {
        item = {
          img: emptySlotIcons[key] ?? emptySlotIcons.arsenal,
          name: "No Item",
          system: {}
        };
      }
      equipped[column][key] = {
        item: item,
        dataset: {
          equipmentSlot: key,
          action: "changeEquipped"
        }
      };
    };

    // Arsenal.
    await setup("primary", "arsenal", primary);
    if (!primary || !primary.isTwoHanded) await setup("secondary", "arsenal", secondary);

    // Armor.
    for (const [key, item] of Object.entries(this.document.armor)) {
      await setup(key, "armor", item, orders[key]);
    }

    return {
      arsenal: Object.values(equipped.arsenal),
      armor: Object.values(equipped.armor)
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  async _prepareItems() {
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
          const data = {
            item: item,
            isExpanded: this._expandedItems.has(item.uuid)
          };
          if (data.isExpanded) {
            data.enrichedText = await TextEditor.enrichHTML(item.system.description.value, {
              relativeTo: item, rollData: item.getRollData()
            });
          }

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
      const newBar = newElement.querySelector(".health-bar");
      const frames = [{top: `${state.healthHeight}px`}, {top: `${Math.max(newBar.offsetTop, 0)}px`}];
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
    this.document.rollSkill({skillId: target.dataset.skillId});
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
    new EquipDialog({actor: this.document, slot: slot}).render({force: true});
  }
}
