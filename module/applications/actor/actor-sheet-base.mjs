import {ArtichronSheetMixin} from "../base-sheet.mjs";
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
      changeEquipped: this._onChangeEquipped
    }
  };

  /** @override */
  static PARTS = {
    header: {template: "systems/artichron/templates/partials/sheet-header.hbs"},
    tabs: {template: "systems/artichron/templates/partials/tabs.hbs"},
    attributes: {template: "systems/artichron/templates/partials/actor-attributes.hbs", scrollable: [""]},
    equipment: {template: "systems/artichron/templates/partials/actor-equipment.hbs", scrollable: [""]},
    inventory: {template: "systems/artichron/templates/partials/actor-inventory.hbs", scrollable: [""]},
    effects: {template: "systems/artichron/templates/partials/effects.hbs", scrollable: [""]},
    encumbrance: {template: "systems/artichron/templates/partials/actor-encumbrance.hbs"}
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
      items: this._prepareItems(),
      encumbrance: this._prepareEncumbrance(),
      effects: await this._prepareEffects(),
      tabs: this._getTabs(),
      isEditMode: this.isEditMode,
      isPlayMode: this.isPlayMode
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
      resistances.push({
        label: CONFIG.SYSTEM.DAMAGE_TYPES[k].label,
        color: CONFIG.SYSTEM.DAMAGE_TYPES[k].color,
        icon: CONFIG.SYSTEM.DAMAGE_TYPES[k].icon,
        value: ie ? src[k].value : v.value,
        key: k
      });
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
      primary: 1,
      secondary: 2,

      head: 1,
      chest: 2,
      legs: 3,

      accessory: 1,
      arms: 2,
      boots: 3
    };

    const equipped = {
      left: {},
      center: {},
      right: {}
    };

    const setup = async (key, column = "left", item = null, order) => {
      equipped[column][key] = {
        cssClass: item ? "" : "empty",
        img: item ? item.img : (emptySlotIcons[key] ?? emptySlotIcons.arsenal),
        canEdit: !!item,
        content: item ? await TextEditor.enrichHTML(item.system.description.value, {
          rollData: item.getRollData(), relativeTo: item
        }) : "",
        order: order,
        dataset: [
          ["item-uuid", item?.uuid],
          ["tooltip", item?.name],
          ["tooltip-direction", "UP"],
          ["equipment-slot", key]
        ].filter(([k, v]) => !!v)
      };
    };

    // Arsenal.
    await setup("primary", "center", primary, orders.primary);
    if (!primary || !primary.isTwoHanded) await setup("secondary", "center", secondary, orders.secondary);

    // Equipment.
    for (const [key, item] of Object.entries(this.document.armor)) {
      const col = ["head", "chest", "legs"].includes(key) ? "left" : "right";
      await setup(key, col, item, orders[key]);
    }

    return {
      left: Object.values(equipped.left),
      center: Object.values(equipped.center),
      right: Object.values(equipped.right)
    };
  }

  /**
   * Prepare the items for rendering.
   * @returns {object}
   */
  _prepareItems() {
    const types = this.document.itemTypes;
    const sections = {
      arsenal: {
        label: "ARTICHRON.SheetTab.Arsenal",
        types: ["weapon", "spell", "shield"]
      },
      armor: {
        label: "ARTICHRON.SheetTab.Gear",
        types: ["armor"]
      },
      consumables: {
        label: "ARTICHRON.SheetTab.Consumables",
        types: ["elixir", "food"]
      },
      loot: {
        label: "ARTICHRON.SheetTab.Loot",
        types: ["part"]
      }
    };

    const tabs = [];
    for (const [k, v] of Object.entries(sections)) {
      const isActive = this.tabGroups.inventory === k;
      const section = {
        label: v.label,
        cssClass: isActive ? "item active" : "item",
        tabCssClass: isActive ? "tab scrollable active" : "tab scrollable",
        id: k,
        items: []
      };
      for (const t of v.types) {
        for (const item of types[t]) {
          section.items.push({
            item: item,
            favorited: this.document.system.equipped.favorites.has(item),
            hasQty: "quantity" in item.system,
            hasUsage: ("usage" in item.system) && (item.system.usage.max > 0)
          });
        }
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

  /* -------------------------------------------- */
  /*                EVENT HANDLERS                */
  /* -------------------------------------------- */

  static _onCreateItem(event, target) {
    getDocumentClass("Item").createDialog({
      img: "icons/svg/chest.svg"
    }, {parent: this.document});
  }
  static async _onUseItem(event, target) {
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    item.use();
  }
  static async _onEditItem(event, target) {
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    item.sheet.render(true);
  }
  static async _onDeleteItem(event, target) {
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    item.deleteDialog();
  }
  static async _onFavoriteItem(event, target) {
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    item.favorite();
  }
  async _onUpdateEmbedded(event) {
    const target = event.currentTarget;
    const property = target.dataset.property;
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    const result = artichron.utils.parseInputDelta(target, item);
    if (result !== undefined) item.update({[property]: result});
  }
  static _onRollSkill(event, target) {
    this.document.rollSkill(target.dataset.skill);
  }
  static _onToggleConfig(event, target) {
    let Cls;
    switch (target.dataset.trait) {
      case "pools": Cls = PoolConfig; break;
      case "skills": Cls = SkillConfig; break;
    }
    new Cls({document: this.document}).render(true);
  }
  static _onRecoverHealth(event, target) {
    this.document.recover();
  }
  static _onRollPool(event, target) {
    this.document.rollPool(target.dataset.pool, {event});
  }

  /** Handle changing the equipped item in a particular slot. */
  static async _onChangeEquipped(event, target) {
    const slot = target.closest("[data-equipment-slot]").dataset.equipmentSlot;

    let items;
    let icon;
    let type;
    if (["head", "chest", "legs", "accessory", "arms", "boots"].includes(slot)) {
      items = this.document.items.filter(item => (item.type === "armor") && (item.system.category.subtype === slot));
      icon = "fa-solid fa-shield-alt";
      type = "armor";
    } else if (["primary", "secondary"].includes(slot)) {
      items = this.document.items.filter(item => {
        if (!item.isArsenal) return false;
        const {primary, secondary} = this.document.arsenal;
        if (slot === "primary") return !secondary || (secondary !== item);
        if (slot === "secondary") return (!primary || (primary !== item)) && item.isOneHanded;
      });
      icon = "fa-solid fa-hand-fist";
      type = "arsenal";
    }
    if (!items?.length) {
      ui.notifications.warn("ARTICHRON.Warning.NoAvailableEquipment", {localize: true});
      return null;
    }

    const currentId = this.document.system.equipped[type][slot]?.id;

    const buttons = items.map(item => {
      return {
        label: `<img src="${item.img}"> ${item.name}`,
        action: item.id,
        class: ["image-button", (item.id === currentId) ? "unequip" : null].filterJoin(" ")
      };
    });
    const style = `
    <style>
    .standard-form .form-footer {
      max-height: 400px;
      overflow: hidden auto;

      & > button.image-button {
        height: unset;
        padding: 0;
        overflow: hidden;

        & > span {
          display: grid;
          grid-template-columns: 75px 1fr;
          align-items: center;
          width: 100%;
        }

        &.unequip {
          text-decoration: line-through;
          border-width: medium;
        }

        & img {
          width: 75px;
          height: 75px;
          border: none;
        }
      }
    }
    </style>`;

    const itemId = await foundry.applications.api.DialogV2.wait({
      rejectClose: false,
      window: {title: "ARTICHRON.EquipDialog.Title", icon: icon},
      position: {width: 350},
      content: style,
      buttons: buttons
    });
    if (!itemId) return null;
    const item = this.document.items.get(itemId);
    const unequip = currentId === itemId;
    const update = {[`system.equipped.${type}.${slot}`]: unequip ? null : itemId};
    if ((type === "arsenal") && (slot === "primary") && !unequip && item?.isTwoHanded) {
      update["system.equipped.arsenal.secondary"] = null;
    }
    this.document.update(update);
  }
}
