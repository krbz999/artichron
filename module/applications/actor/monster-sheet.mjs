import ActorSheetArtichron from "./actor-sheet-base.mjs";

export default class MonsterSheet extends ActorSheetArtichron {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["monster"],
    position: {width: 400},
    actions: {
      changeEquipped: MonsterSheet.#onChangeEquipped,
      decreaseLoot: MonsterSheet.#onDecreaseLoot,
      grantLoot: MonsterSheet.#grantLoot,
      increaseLoot: MonsterSheet.#onIncreaseLoot,
      removeLoot: MonsterSheet.#onRemoveLoot
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
    about: {
      template: "systems/artichron/templates/actor/monster-about.hbs",
      scrollable: [""]
    },
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
      isEditable: this.isEditable,
      equipment: this.#prepareEquipment(),
      compactItems: {
        compact: this.document.flags.artichron?.compactItems ?? game.settings.get("artichron", "compactItems")
      }
    };

    if (context.isEditMode) {
      const field = new foundry.data.fields.NumberField({
        label: "Compact Items",
        hint: "Toggle whether items are shown in a list or a grid.",
        choices: {
          0: "Expanded",
          1: "Compact"
        }
      });
      const value = this.document.flags.artichron?.compactItems ?? null;
      context.compactItems.field = field;
      context.compactItems.value = value;
    }

    // Biography.
    context.biography = {
      field: doc.system.schema.getField("biography.value"),
      value: doc.system.biography.value,
      enriched: await TextEditor.enrichHTML(doc.system.biography.value, {
        relativeTo: doc, rollData: rollData
      })
    };

    // Details.
    context.details = [{
      field: this.document.system.schema.getField("danger.value"),
      value: (context.isEditMode ? this.document._source : this.document).system.danger.value
    }, {
      field: this.document.system.schema.getField("danger.pool.spent"),
      value: (context.isEditMode ? this.document._source : this.document).system.danger.pool.spent,
      max: this.document.system.danger.pool.max
    }, {
      field: this.document.system.schema.getField("danger.pool.max"),
      value: (context.isEditMode ? this.document._source : this.document).system.danger.pool.max
    }];

    // Prepare a resistance for rendering.
    const makeResistance = (key, path) => {
      const value = foundry.utils.getProperty(doc.system, path);
      const {label, color, icon} = CONFIG.SYSTEM.DAMAGE_TYPES[key];
      context.resistances[key] = {
        value: value, label: label, color: color, icon: icon, active: value > 0
      };
    };
    // Armor and resistances.
    makeResistance("physical", "defenses.armor");
    for (const k of Object.keys(doc.system.resistances)) {
      makeResistance(k, `resistances.${k}`);
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
      const expanded = this._expandedItems.has(item.uuid);
      const data = {
        item: item,
        enriched: expanded ? await TextEditor.enrichHTML(item.system.description.value, {
          relativeTo: item, rollData: item.getRollData()
        }) : null
      };

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

  /**
   * Prepare equipped items for rendering.
   * @returns {object[]}
   */
  #prepareEquipment() {
    // TODO: this method is a complete copy of the hero sheet's identical method.
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
    if (this.tabGroups.primary !== "loot") return super._onDrop(event);

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
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #onRemoveLoot(event, target) {
    const uuid = target.closest("[data-uuid]").dataset.uuid;
    this.document.system.removeLootDrop(uuid);
  }

  /* -------------------------------------------------- */

  /**
   * Increase the quantity of a loot entry.
   * @this {MonsterSheet}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #onIncreaseLoot(event, target) {
    const uuid = target.closest("[data-uuid]").dataset.uuid;
    this.document.system.adjustLootDrop(uuid, 1);
  }

  /* -------------------------------------------------- */

  /**
   * Decrease the quantity of a loot entry.
   * @this {MonsterSheet}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #onDecreaseLoot(event, target) {
    const uuid = target.closest("[data-uuid]").dataset.uuid;
    this.document.system.adjustLootDrop(uuid, -1);
  }

  /* -------------------------------------------------- */

  /**
   * Grant the loot of this monster to the primary party.
   * @this {MonsterSheet}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static async #grantLoot(event, target) {
    target.disabled = true;

    const confirm = await foundry.applications.api.DialogV2.confirm({
      modal: true,
      rejectClose: false,
      content: game.i18n.format("ARTICHRON.LootDialog.Content", {name: this.document.name}),
      window: {
        title: game.i18n.format("ARTICHRON.LootDialog.Title", {name: this.document.name}),
        icon: "fa-solid fa-box-open"
      },
      position: {width: 400}
    });
    if (!confirm) {
      target.disabled = false;
      return;
    }

    this.document.system.grantLootDrops();
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to change an equipped item in a particular slot.
   * @this {MonsterSheet}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #onChangeEquipped(event, target) {
    // TODO: this is copied from the hero sheet.
    if (!this.isEditable) return;
    const slot = target.closest("[data-equipment-slot]").dataset.equipmentSlot;
    this.document.system.changeEquippedDialog(slot);
  }
}
