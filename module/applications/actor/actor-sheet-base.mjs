import {ArtichronSheetMixin} from "../base-sheet.mjs";
import EquipDialog from "../item/equip-dialog.mjs";
import PoolConfig from "./configs/pool-config.mjs";
import SkillConfig from "./configs/skill-config.mjs";

export default class ActorSheetArtichron extends ArtichronSheetMixin(foundry.applications.sheets.ActorSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron", "actor"],
    position: {width: 500, top: 100, left: 200, height: "auto"},
    actions: {
      createItem: this._onCreateItem,
      useItem: this._onUseItem,
      editItem: this._onEditItem,
      favoriteItem: this._onFavoriteItem,
      deleteItem: this._onDeleteItem,
      recoverHealth: this._onRecoverHealth,
      toggleConfig: this._onToggleConfig,
      rollSkill: this._onRollSkill,
      rollPool: this._onRollPool,
      changeEquipped: this._onChangeEquipped,
      fuseItem: this._onFuseItem
    }
  };

  /** @override */
  static PARTS = {
    header: {template: "systems/artichron/templates/shared/sheet-header.hbs"},
    tabs: {template: "systems/artichron/templates/shared/tabs.hbs"},
    attributes: {template: "systems/artichron/templates/actor/tab-attributes.hbs", scrollable: [""]},
    equipment: {template: "systems/artichron/templates/actor/tab-equipment.hbs", scrollable: [""]},
    inventory: {
      template: "systems/artichron/templates/actor/tab-inventory.hbs",
      scrollable: ["[data-group='inventory'].scrollable.active"]
    },
    effects: {template: "systems/artichron/templates/shared/effects.hbs", scrollable: [""]},
    encumbrance: {template: "systems/artichron/templates/actor/tab-encumbrance.hbs"}
  };

  /** @override */
  tabGroups = {
    primary: "attributes",
    inventory: "arsenal"
  };

  /** @override */
  static TABS = {
    attributes: {id: "attributes", group: "primary", label: "ARTICHRON.SheetTab.Attributes"},
    equipment: {id: "equipment", group: "primary", label: "ARTICHRON.SheetTab.Equipment"},
    inventory: {id: "inventory", group: "primary", label: "ARTICHRON.SheetTab.Inventory"},
    effects: {id: "effects", group: "primary", label: "ARTICHRON.SheetTab.Effects"}
  };

  /** @override */
  async _prepareContext(options) {
    const doc = this.document;
    const src = doc.toObject();
    const rollData = doc.getRollData();

    const context = {
      document: doc,
      config: CONFIG.SYSTEM,
      health: this._prepareHealth(),
      pools: this._preparePools(),
      equipment: await this._prepareEquipment(),
      items: await this._prepareItems(),
      encumbrance: this._prepareEncumbrance(),
      effects: await this._prepareEffects(),
      tabs: this._getTabs(),
      isEditMode: this.isEditMode,
      isPlayMode: this.isPlayMode,
      isEditable: this.isEditable
    };

    const makeResistance = (key, path) => {
      context.resistances ??= {};
      const value = foundry.utils.getProperty(context.isEditMode ? src.system : doc.system, path);
      if (!context.isEditMode && !value) return;
      context.resistances[key] = {
        field: doc.system.schema.getField(path),
        value: value,
        label: CONFIG.SYSTEM.DAMAGE_TYPES[key].label,
        color: CONFIG.SYSTEM.DAMAGE_TYPES[key].color,
        icon: CONFIG.SYSTEM.DAMAGE_TYPES[key].icon,
        name: `system.${path}`
      };
    };

    // Armor and resistances.
    makeResistance("physical", "defenses.armor.value");
    for (const k of Object.keys(doc.system.resistances)) {
      makeResistance(k, `resistances.${k}.value`);
    }
    context.resistances = Object.values(context.resistances);

    // Name and img.
    context.header = {
      name: context.isPlayMode ? doc.name : src.name,
      img: context.isPlayMode ? doc.img : src.img
    };

    return context;
  }

  /**
   * Prepare health.
   * @returns {object}
   */
  _prepareHealth() {
    const hp = this.document.system.health;
    return {
      value: hp.value,
      max: hp.max,
      height: Math.round(Math.clamp(hp.value / hp.max, 0, 1) * 100)
    };
  }

  /**
   * Prepare health, stamina, mana pools.
   * @returns {object[]}
   */
  _preparePools() {
    const pools = Object.entries(this.document.system.pools).map(([key, pool]) => {
      return {...pool, key: key, value: pool.value || 0, die: pool.die, denom: pool.denom};
    });
    return pools;
  }

  /**
   * Prepare resistances for rendering.
   * @returns {object}
   */
  _prepareResistances() {
    const resistances = [];
    const ie = this.isEditMode;
    const src = this.document.system.toObject().resistances;

    for (const [k, v] of Object.entries(this.document.system.resistances)) {
      if (!ie && !v.value) continue;
      const {label, color, icon} = CONFIG.SYSTEM.DAMAGE_TYPES[k];
      resistances.push({label, color, icon, key: k, value: ie ? src[k].value : v.value});
    }

    return resistances;
  }

  /**
   * Prepare equipped items for rendering.
   * @returns {Promise<object[]>}
   */
  async _prepareEquipment() {
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
      equipped[column][key] = {
        cssClass: item ? "" : "empty",
        img: item ? item.img : (emptySlotIcons[key] ?? emptySlotIcons.arsenal),
        name: item ? item.name : "",
        canEdit: !!item,
        order: order,
        dataset: [
          ["item-uuid", item?.uuid],
          //["tooltip", item?.name],
          ["tooltip-direction", "UP"],
          ["equipment-slot", key]
        ].filter(([k, v]) => !!v)
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

  /**
   * Prepare the items for rendering.
   * @returns {Promise<object>}
   */
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
      const isActive = this.tabGroups.inventory === k;
      const section = {
        label: v.label,
        cssClass: isActive ? "active" : "",
        tabCssClass: isActive ? "tab scrollable active" : "tab scrollable",
        id: k,
        items: []
      };
      for (const t of v.types) {
        for (const item of types[t]) {
          const data = {
            item: item,
            favorited: this.document.system.equipped.favorites.has(item),
            hasQty: "quantity" in item.system,
            hasUses: item.hasUses,
            hasFusions: item.hasFusions && !item.isFused,
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

  /**
   * Prepare encumbrance bar.
   * @returns {object}
   */
  _prepareEncumbrance() {
    const enc = this.document.system.encumbrance;
    return {...enc, percent: Math.round(Math.clamp(enc.value / enc.max, 0, 1) * 100)};
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    if (!this.isEditable) return;

    this.element.querySelectorAll("[data-action=updateEmbedded").forEach(n => {
      n.addEventListener("change", this._onUpdateEmbedded.bind(this));
    });
  }

  /** @override */
  _syncPartState(partId, newElement, priorElement, state) {
    super._syncPartState(partId, newElement, priorElement, state);

    if (partId === "attributes") {
      const oldBar = priorElement.querySelector(".health-bar");
      const newBar = newElement.querySelector(".health-bar");
      const frames = [{height: oldBar.style.height}, {height: newBar.style.height}];
      newBar.animate(frames, {duration: 1000, easing: "ease"});
    }

    else if (partId === "encumbrance") {
      const oldBar = priorElement.querySelector(".encumbrance .bar");
      const newBar = newElement.querySelector(".encumbrance .bar");
      const frames = [{width: oldBar.style.width}, {width: newBar.style.width}];
      newBar.animate(frames, {duration: 1000, easing: "ease"});
    }
  }

  /* ---------------------------------------- */
  /*              EVENT HANDLERS              */
  /* ---------------------------------------- */

  /**
   * Handle click events to create an item.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static _onCreateItem(event, target) {
    if (!this.isEditable) return;
    const types = Object.entries(CONFIG.Item.dataModels).reduce((acc, [type, cls]) => {
      if (cls.metadata.inventorySection === target.dataset.section) {
        acc.push(type);
      }
      return acc;
    }, []);
    getDocumentClass("Item").createDialog({}, {types: types, parent: this.document});
  }

  /**
   * Handle click events to use an item.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static async _onUseItem(event, target) {
    if (!this.isEditable) return;
    event.stopPropagation();
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    item.use();
  }

  /**
   * Handle click events to render an item's sheet.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static async _onEditItem(event, target) {
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    item.sheet.render(true);
  }

  /**
   * Handle click events to delete an item.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static async _onDeleteItem(event, target) {
    if (!this.isEditable) return;
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    item.deleteDialog();
  }

  /**
   * Handle click events to toggle an item's Favorited state.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static async _onFavoriteItem(event, target) {
    if (!this.isEditable) return;
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    item.favorite();
  }

  /**
   * Handle the change events on input fields that should propagate to the embedded document.
   * @param {Event} event             The initiating change event.
   */
  async _onUpdateEmbedded(event) {
    if (!this.isEditable) return;
    const target = event.currentTarget;
    const property = target.dataset.property;
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    const result = artichron.utils.parseInputDelta(target, item);
    if (result !== undefined) item.update({[property]: result});
  }

  /**
   * Handle click events to roll a skill.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static _onRollSkill(event, target) {
    if (!this.isEditable) return;
    this.document.rollSkill(target.dataset.skill);
  }

  /**
   * Handle click events to render a configuration menu.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static _onToggleConfig(event, target) {
    if (!this.isEditable) return;
    let Cls;
    switch (target.dataset.trait) {
      case "pools": Cls = PoolConfig; break;
      case "skills": Cls = SkillConfig; break;
    }
    new Cls({document: this.document}).render(true);
  }

  /**
   * Handle click events to restore the actor's hit points and other resources.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static _onRecoverHealth(event, target) {
    if (!this.isEditable) return;
    this.document.recover();
  }

  /**
   * Handle click events to roll one of the pools.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static _onRollPool(event, target) {
    if (!this.isEditable) return;
    this.document.rollPool(target.dataset.pool, {event});
  }

  /**
   * Handle click events to fuse one item onto another.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static async _onFuseItem(event, target) {
    if (!this.isEditable) return;
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    item.fuseDialog();
  }

  /**
   * Handle click events to change an equipped item in a particular slot.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static async _onChangeEquipped(event, target) {
    if (!this.isEditable) return;
    const slot = target.closest("[data-equipment-slot]").dataset.equipmentSlot;
    new EquipDialog({actor: this.document, slot: slot}).render(true);
    return;
  }
}
