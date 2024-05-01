import ItemArtichron from "../../documents/item/item.mjs";
import {SYSTEM} from "../../helpers/config.mjs";
import {ArtichronSheetMixin} from "../base-sheet.mjs";
import PoolConfig from "./configs/pool-config.mjs";
import SkillConfig from "./configs/skill-config.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export default class ActorSheetArtichron extends ArtichronSheetMixin(ActorSheet) {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 500,
      top: 100,
      left: 200,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "attributes",
          group: "primary"
        },
        {
          navSelector: "[data-tab=inventory] > .inventory.tabs[data-group=inventory]",
          contentSelector: ".tab.inventory",
          initial: "arsenal",
          group: "inventory"
        },
        {
          navSelector: "[data-tab=consumables] > .inventory.tabs[data-group=inventory]",
          contentSelector: ".tab.consumables",
          initial: "food",
          group: "consumables"
        },
        {
          navSelector: "[data-tab=effects] > .effects.tabs[data-group=effects]",
          contentSelector: ".tab.effects",
          initial: "active",
          group: "effects"
        }
      ],
      classes: ["sheet", "actor", "artichron"],
      scrollY: [".equipped-items", ".documents-list"]
    });
  }

  /** @override */
  get template() {
    return `systems/artichron/templates/actor/actor-sheet-${this.document.type}.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options = {}) {
    const data = super.getData();
    foundry.utils.mergeObject(data, {
      context: {
        equipped: this._prepareEquipment(),
        resistances: this._prepareResistances(),
        items: this._prepareItems(),
        pools: this._preparePools(),
        effects: this._prepareEffects(),
        health: this._prepareHealth(),
        encumbrance: this._prepareEncumbrance()
      }
    });
    return data;
  }

  /**
   * Prepare health.
   * @returns {object}
   */
  _prepareHealth() {
    const hp = this.document.system.health;
    return {height: Math.clamp(hp.value / hp.max, 0, 1) * 100};
  }

  /**
   * Prepare encumbrance bar.
   * @returns {object}
   */
  _prepareEncumbrance() {
    const enc = this.document.system.encumbrance;
    return {percent: Math.round(enc.value / enc.max * 100)};
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
   * Prepare the items for rendering.
   * @returns {object}
   */
  _prepareItems() {
    const types = this.document.itemTypes;
    const map = key => ({
      key: key,
      items: types[key].map(item => {
        return {
          item: item,
          favorited: this.document.system.equipped.favorites.has(item),
          hasQty: "quantity" in item.system,
          hasUsage: ("usage" in item.system) && (item.system.usage.max > 0)
        };
      }),
      label: `TYPES.Item.${key}Pl`
    });
    return {
      inventory: ["weapon", "spell", "shield", "armor", "part"].map(map),
      consumable: ["food", "elixir"].map(map)
    };
  }

  /**
   * Prepare effects for rendering.
   * @returns {object[]}
   */
  _prepareEffects() {
    const effects = [];
    for (const effect of this.document.allApplicableEffects()) {
      effects.push({
        uuid: effect.uuid,
        img: effect.img,
        name: effect.name,
        source: effect.parent.name,
        toggleTooltip: effect.disabled ? "ToggleOn" : "ToggleOff",
        toggleIcon: effect.disabled ? "fa-toggle-off" : "fa-toggle-on"
      });
    }
    effects.sort((a, b) => a.name.localeCompare(b.name));
    return effects;
  }

  /**
   * Prepare resistances for rendering.
   * @returns {object}
   */
  _prepareResistances() {
    const res = this.document.system.resistances;
    const resistances = {};
    for (const [k, v] of Object.entries(res)) {
      resistances[k] = {
        ...SYSTEM.DAMAGE_TYPES[k],
        total: v.total,
        source: v.toObject(),
        key: k
      };
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

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    // listeners that only work on editable or owned sheets go here
    html[0].querySelectorAll("[data-action]").forEach(n => {
      switch (n.dataset.action) {
        case "createItem": n.addEventListener("click", this._onCreateItem.bind(this)); break;
        case "useItem": n.addEventListener("click", this._onUseItem.bind(this)); break;
        case "updateEmbedded": n.addEventListener("change", this._onUpdateEmbedded.bind(this)); break;
        case "favoriteItem": n.addEventListener("click", this._onFavoriteItem.bind(this)); break;
        case "editItem": n.addEventListener("click", this._onEditItem.bind(this)); break;
        case "deleteItem": n.addEventListener("click", this._onDeleteItem.bind(this)); break;
        case "rollDefense": n.addEventListener("click", this._onRollDefense.bind(this)); break;
        case "recover": n.addEventListener("click", this._onRecover.bind(this)); break;
        case "toggleConfig": n.addEventListener("click", this._onToggleConfig.bind(this)); break;
        case "rollSkill": n.addEventListener("click", this._onRollSkill.bind(this)); break;
        case "rollPool": n.addEventListener("click", this._onRollPool.bind(this)); break;
        case "editImage": n.addEventListener("click", this._onEditImage.bind(this)); break;
        case "changeEquipped": n.addEventListener("click", this._onChangeEquipped.bind(this)); break;
      }
    });
  }

  /**
   * Handle editing actor image.
   * @param {PointerEvent} event      Initiating right-click event.
   */
  _onEditImage(event) {
    const current = this.document.img;
    const fp = new FilePicker({
      type: "image",
      current: current,
      callback: path => this.document.update({img: path}),
      top: this.position.top + 40,
      left: this.position.left + 10
    });
    return fp.browse();
  }

  _onCreateItem(event) {
    getDocumentClass("Item").createDialog({
      img: "icons/svg/chest.svg",
      type: event.currentTarget.closest("[data-item-type]").dataset.itemType
    }, {parent: this.document});
  }
  _onUseItem(event) {
    this._getEntryFromEvent(event).use();
  }
  _onEditItem(event) {
    this._getEntryFromEvent(event).sheet.render(true);
  }
  _onDeleteItem(event) {
    this._getEntryFromEvent(event).deleteDialog();
  }
  _onFavoriteItem(event) {
    this._getEntryFromEvent(event).favorite();
  }
  _onUpdateEmbedded(event) {
    const property = event.currentTarget.dataset.property;
    const item = this._getEntryFromEvent(event);
    const value = foundry.utils.getProperty(item, property);
    let tval = event.currentTarget.value;
    if (!tval.trim()) tval = null;
    else if (/^[+-][\d]+/.test(tval)) tval = Roll.safeEval(`${value} ${tval}`);
    return item.update({[property]: tval});
  }
  _onRollSkill(event) {
    this.document.rollSkill(event.currentTarget.dataset.skill);
  }
  _onToggleConfig(event) {
    let Cls;
    switch (event.currentTarget.dataset.trait) {
      case "pools": Cls = PoolConfig; break;
      case "skills": Cls = SkillConfig; break;
    }
    new Cls({document: this.actor}).render(true);
  }
  _onRollDefense(event) {
    this.document.rollDefense();
  }
  _onRecover(event) {
    this.document.recover();
  }
  _onRollPool(event) {
    this.document.rollPool(event.currentTarget.dataset.pool, {event});
  }

  /**
   * Handle changing the equipped item in a particular slot.
   * @param {PointerEvent} event      The initiating click event.
   * @returns {Promise<ActorArtichron|null>}
   */
  async _onChangeEquipped(event) {
    const [type, slot] = event.currentTarget.closest("[data-slot]").dataset.slot.split(".");

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

  /** @override */
  _saveScrollPositions(html) {
    super._saveScrollPositions(html);
    this._healthY = html[0].querySelector(".health-bar").style.height;
    this._encumW = html[0].querySelector(".encumbrance-bar").style.width;
  }

  /** @override */
  _restoreScrollPositions(html) {
    super._restoreScrollPositions(html);
    this._restoreHealthHeight(html);
    this._restoreEncumbranceWidth(html);
  }

  /**
   * Ease differences in the health value.
   * @param {HTMLElement} html
   */
  _restoreHealthHeight([html]) {
    const y = this._healthY;
    if (!y) return;
    delete this._healthY;
    const bar = html.querySelector(".health-bar");
    const frames = [{height: y, easing: "ease"}, {height: bar.style.top}];
    const duration = 1000;
    bar.animate(frames, duration);
  }

  /**
   * Ease differences in encumbrance.
   * @param {HTMLElement} html
   */
  _restoreEncumbranceWidth([html]) {
    const w = this._encumW;
    if (!w) return;
    delete this._encumW;
    const bar = html.querySelector(".encumbrance-bar");
    const frames = [{width: w, easing: "ease"}, {width: bar.style.width}];
    const duration = 1000;
    bar.animate(frames, duration);
  }
}
