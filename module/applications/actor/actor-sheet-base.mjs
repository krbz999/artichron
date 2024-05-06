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
      rollDefense: this._onRollDefense,
      recover: this._onRecover,
      toggleConfig: this._onToggleConfig,
      rollSkill: this._onRollSkill,
      changeEquipped: this._onChangeEquipped
    }
  };

  /** @override */
  static PARTS = {
    header: {template: "systems/artichron/templates/partials/sheet-header.hbs"},
    tabs: {template: "systems/artichron/templates/partials/tabs.hbs"},
    attributes: {template: "systems/artichron/templates/partials/actor-attributes.hbs", scrollable: [""]},
    equipped: {template: "systems/artichron/templates/partials/actor-equipped.hbs", scrollable: [""]},
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
    equipped: {id: "equipped", group: "primary", label: "ARTICHRON.SheetTab.Equipped"},
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
      resistances: this._prepareResistances(),
      equipped: this._prepareEquipment(),
      items: this._prepareItems(),
      encumbrance: this._prepareEncumbrance(),
      effects: this._prepareEffects(),
      tabs: this._getTabs(),
      isEditMode: this.isEditMode,
      isPlayMode: this.isPlayMode
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
   * @returns {object[]}
   */
  _prepareEquipment() {
    const [main, second] = Object.values(this.document.arsenal);
    const armor = Object.entries(this.document.armor);

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

    // Main weapon.
    equipped.push({
      cssClass: `weapon main ${main ? "" : "empty"}`,
      item: main,
      img: main ? main.img : emptySlotIcons.arsenal,
      tooltip: main ? main.name : "ARTICHRON.EquipItem",
      hasDamage: main,
      data: {
        "item-id": main ? main.id : null,
        arsenal: main ? "first" : null,
        slot: "arsenal.first"
      }
    });

    // Secondary weapon.
    const disableSecond = main && main.isTwoHanded;
    const emptySecond = !disableSecond && !second;
    const cssClass = [
      "weapon",
      "second",
      emptySecond ? "empty" : null,
      disableSecond ? "disabled" : null
    ].filterJoin(" ");
    equipped.push({
      cssClass: cssClass,
      item: disableSecond ? null : second,
      img: disableSecond ? main.img : second ? second.img : emptySlotIcons.arsenal,
      tooltip: disableSecond ? null : second ? second.name : "ARTICHRON.EquipItem",
      hasDamage: !emptySecond,
      data: {
        "item-id": (!disableSecond && second) ? second.id : null,
        arsenal: disableSecond ? null : "second",
        slot: disableSecond ? null : "arsenal.second"
      }
    });

    // Equipped armor.
    equipped.push(...armor.map(([key, item]) => {
      const e = item ? "" : "empty";
      return {
        cssClass: `${key} ${e}`,
        item: item,
        img: item ? item.img : emptySlotIcons[key],
        tooltip: item ? item.name : "ARTICHRON.EquipItem",
        data: {
          "item-id": item ? item.id : null,
          slot: `armor.${key}`
        }
      };
    }));

    return equipped;
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
      const oldBar = priorElement.querySelector(".encumbrance-bar");
      const newBar = newElement.querySelector(".encumbrance-bar");
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
  static _onRollDefense(event, target) {
    this.document.rollDefense();
  }
  static _onRecover(event, target) {
    this.document.recover();
  }
  static _onRollPool(event, target) {
    this.document.rollPool(target.dataset.pool, {event});
  }

  /** Handle changing the equipped item in a particular slot. */
  static async _onChangeEquipped(event, target) {
    const [type, slot] = target.closest("[data-slot]").dataset.slot.split(".");

    let items;
    let icon;
    if (type === "armor") {
      items = this.document.items.filter(item => (item.type === "armor") && (item.system.category.subtype === slot));
      icon = "fa-solid fa-shield-alt";
    } else if ((type === "arsenal")) {
      items = this.document.items.filter(item => {
        if (!item.isArsenal) return false;
        const {first, second} = this.document.arsenal;
        if (slot === "first") return !second || (second !== item);
        if (slot === "second") return (!first || (first !== item)) && item.isOneHanded;
      });
      icon = "fa-solid fa-hand-fist";
    }
    if (!items?.length) {
      ui.notifications.warn("ARTICHRON.NoAvailableEquipment", {localize: true});
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
    const update = {[`system.equipped.${type}.${slot}`]: unequip ? "" : itemId};
    if ((type === "arsenal") && (slot === "first") && !unequip && item?.isTwoHanded) {
      update["system.equipped.arsenal.second"] = "";
    }
    this.document.update(update);
  }
}
