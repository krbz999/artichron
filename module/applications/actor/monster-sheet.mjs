import ActorSheetArtichron from "./actor-sheet-base.mjs";

export default class MonsterSheet extends ActorSheetArtichron {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["monster"],
    position: {width: 400},
    actions: {
      removeLoot: this.#onRemoveLoot,
      increaseLoot: this.#onIncreaseLoot,
      decreaseLoot: this.#onDecreaseLoot
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    header: {template: "systems/artichron/templates/shared/sheet-header.hbs"},
    health: {template: "systems/artichron/templates/actor/monster-health.hbs"},
    tabs: {template: "systems/artichron/templates/shared/tabs.hbs"},
    actions: {
      template: "systems/artichron/templates/actor/monster-actions.hbs",
      templates: ["systems/artichron/templates/actor/monster-defenses.hbs"],
      scrollable: [""]
    },
    loot: {
      template: "systems/artichron/templates/actor/monster-loot.hbs",
      scrollable: [""]
    },
    about: {template: "systems/artichron/templates/actor/monster-about.hbs"},
    effects: {
      template: "systems/artichron/templates/shared/effects.hbs",
      scrollable: [""]
    }
  };

  /* -------------------------------------------------- */

  /** @override */
  tabGroups = {
    primary: "actions"
  };

  /* -------------------------------------------------- */

  /** @override */
  static TABS = {
    actions: {id: "actions", group: "primary", label: "ARTICHRON.SheetTab.Actions"},
    loot: {id: "loot", group: "primary", label: "ARTICHRON.SheetTab.Loot"},
    about: {id: "about", group: "primary", label: "ARTICHRON.SheetTab.About"},
    effects: {id: "effects", group: "primary", label: "ARTICHRON.SheetTab.Effects"}
  };

  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const doc = this.document;
    const src = this.document.toObject();
    const rollData = this.document.getRollData();
    const effects = await this._prepareEffects();
    const [buffs, conditions] = effects.partition(e => e.effect.type === "condition");

    const context = {
      document: doc,
      resistances: {},
      effects: buffs,
      conditions: conditions,
      health: {
        src: src.system.health,
        doc: doc.system.health
      },
      tabs: this._getTabs(),
      isEditMode: this.isEditMode,
      isPlayMode: this.isPlayMode,
      isEditable: this.isEditable
    };

    // Biography.
    context.biography = {
      field: doc.system.schema.getField("biography.value"),
      value: doc.system.biography.value,
      enriched: await TextEditor.enrichHTML(doc.system.biography.value, {
        relativeTo: doc, rollData: rollData
      })
    };

    // Prepare a resistance for rendering.
    const makeResistance = (key, path) => {
      const value = foundry.utils.getProperty(context.isEditMode ? src.system : doc.system, path);
      const {label, color, icon} = CONFIG.SYSTEM.DAMAGE_TYPES[key];
      const field = doc.system.schema.getField(path);
      const name = `system.${path}`;
      const active = context.isEditMode || !!value;
      context.resistances[key] = {field, value, label, color, icon, name, active};
    };
    // Armor and resistances.
    makeResistance("physical", "defenses.armor.value");
    for (const k of Object.keys(doc.system.resistances)) {
      makeResistance(k, `resistances.${k}.value`);
    }
    context.resistances = Object.values(context.resistances);

    // Name and img.
    const {name, img} = context.isPlayMode ? doc : src;
    context.header = {name, img};

    // Prepare items.
    context.items = await this._prepareItems();
    context.loot = await this.#prepareLootItems();

    return context;
  }

  /* -------------------------------------------------- */

  /** @override */
  async _prepareItems() {
    const favorites = [];
    const items = [];

    const favoritedItems = this.document.favorites;

    const contents = this.document.items.contents.sort((a, b) => {
      const sort = a.sort - b.sort;
      if (sort) return sort;
      return a._source.name.localeCompare(b._source.name);
    });

    for (const item of contents) {
      const data = {
        item: item,
        isExpanded: this._expandedItems.has(item.uuid)
      };
      if (data.isExpanded) {
        data.enrichedText = await TextEditor.enrichHTML(item.system.description.value, {
          relativeTo: item, rollData: item.getRollData()
        });
      }

      if (favoritedItems.has(item)) favorites.push(data);
      else items.push(data);
    }

    return {favorites, items};
  }

  /* -------------------------------------------------- */

  /**
   * Prepare the array of loot items.
   * @returns {Promise<object[]>}
   */
  async #prepareLootItems() {
    const items = this.document.system.lootDrops;
    return items.sort((a, b) => a.item.name.localeCompare(b.item.name));
  }

  /* -------------------------------------------------- */

  /** @override */
  _preSyncPartState(p, ne, pe, s) {
    super._preSyncPartState(p, ne, pe, s);

    if (p === "health") {
      const o = pe.querySelector(".health-bar");
      s.healthWidth = Math.max(o.offsetWidth, 0);
    }
  }

  /* -------------------------------------------------- */

  /** @override */
  _syncPartState(partId, newElement, priorElement, state) {
    super._syncPartState(partId, newElement, priorElement, state);

    if (partId === "health") {
      const newBar = newElement.querySelector(".health-bar");
      const frames = [{width: `${state.healthWidth}px`}, {width: `${Math.max(newBar.offsetWidth, 0)}px`}];
      newBar.animate(frames, {duration: 1000, easing: "ease-in-out"});
    }
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /** @override */
  async _onDrop(event) {
    if (!event.target.closest("[data-application-part=loot]")) return super._onDrop(event);

    const {type, uuid} = TextEditor.getDragEventData(event);
    if (type !== "Item") return;
    const item = await fromUuid(uuid);
    if (item.isEmbedded) return;
    return this.document.system.addLootDrop(uuid, 1);
  }

  /* -------------------------------------------------- */

  /**
   * Remove a loot entry.
   * @this {MonsterSheet}
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      Element with listener attached.
   */
  static #onRemoveLoot(event, target) {
    const uuid = target.closest("[data-uuid]").dataset.uuid;
    this.document.system.removeLootDrop(uuid);
  }

  /* -------------------------------------------------- */

  /**
   * Increase the quantity of a loot entry.
   * @this {MonsterSheet}
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      Element with listener attached.
   */
  static #onIncreaseLoot(event, target) {
    const uuid = target.closest("[data-uuid]").dataset.uuid;
    this.document.system.adjustLootDrop(uuid, 1);
  }

  /* -------------------------------------------------- */

  /**
   * Decrease the quantity of a loot entry.
   * @this {MonsterSheet}
   * @param {Event} event             Initiating click event.
   * @param {HTMLElement} target      Element with listener attached.
   */
  static #onDecreaseLoot(event, target) {
    const uuid = target.closest("[data-uuid]").dataset.uuid;
    this.document.system.adjustLootDrop(uuid, -1);
  }
}
