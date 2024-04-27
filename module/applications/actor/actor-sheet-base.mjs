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
      scrollY: [".equipped-items", ".documents-list"],
      dragDrop: [{dragSelector: ".item-name"}]
    });
  }

  /** @override */
  get template() {
    return `systems/artichron/templates/actor/actor-sheet-${this.document.type}.hbs`;
  }

  /** @override */
  _onDragStart(event) {
    const entry = this._getEntryFromEvent(event);
    const data = entry.toDragData();
    event.dataTransfer.setData("text/plain", JSON.stringify(data));
  }

  /**
   * Get the item or effect from this actor's collection, or an item's collection of effects.
   * @param {Event} event
   * @returns {ItemArtichron|ActiveEffectArtichron}
   */
  _getEntryFromEvent(event) {
    const embeddedName = event.currentTarget.closest("[data-collection]").dataset.collection;
    const data = event.currentTarget.closest("[data-item-id]").dataset;
    const parent = data.parentId ? this.document.items.get(data.parentId) : this.document;
    return parent.getEmbeddedCollection(embeddedName).get(data.itemId);
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
   * @returns {object}
   */
  _prepareEffects() {
    const effects = Array.from(this.document.allApplicableEffects());
    const {active, inactive} = effects.reduce((acc, effect) => {
      const data = {
        effect: effect,
        isItem: effect.parent instanceof CONFIG.Item.documentClass,
        icon: !effect.disabled ? "fa-times" : "fa-check"
      };
      acc[effect.active ? "active" : "inactive"].push(data);
      return acc;
    }, {active: [], inactive: []});
    return {
      active: {label: "ARTICHRON.EffectsActive", data: active, key: "active"},
      inactive: {label: "ARTICHRON.EffectsInactive", data: inactive, key: "inactive"}
    };
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
      const action = n.dataset.action;
      if (action === "control") n.addEventListener("click", this._onClickManageItem.bind(this));
      else if (action === "toggle-config") n.addEventListener("click", this._onClickConfig.bind(this));
      else if (action === "manage") n.addEventListener("click", this._onClickManageActor.bind(this));
      else if (action === "update") n.addEventListener("change", this._onChangeManageItem.bind(this));
      else if (action === "rollSkill") n.addEventListener("click", this._onClickSkill.bind(this));
    });
  }

  /**
   * Handle editing actor image.
   * @param {PointerEvent} event      Initiating right-click event.
   */
  _onEditImg(event) {
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

  /**
   * Handle clicking an item control.
   * @param {PointerEvent} event      The initiating click event.
   * @returns {Promise<*>}
   */
  async _onClickManageItem(event) {
    const control = event.currentTarget.dataset.control;
    const embeddedName = event.currentTarget.closest("[data-collection]").dataset.collection;

    // Create a new document.
    if (control === "create") {
      const collection = this.document.getEmbeddedCollection(embeddedName);
      const name = game.i18n.format("DOCUMENT.New", {
        type: game.i18n.localize(`DOCUMENT.${collection.documentClass.documentName}`)
      });
      const img = {effects: "icons/svg/sun.svg", items: "icons/svg/chest.svg"}[embeddedName];
      let type;
      let disabled;
      if (embeddedName === "items") type = event.currentTarget.closest("[data-item-type]").dataset.itemType;
      if (embeddedName === "effects") disabled = event.currentTarget.closest("[data-active]").dataset.active === "inactive";
      return collection.documentClass.implementation.createDialog({
        name: name,
        img: img,
        type: type,
        disabled: disabled
      }, {parent: this.document, renderSheet: true});
    }

    // Show the document's sheet.
    else if (control === "edit") {
      return this._getEntryFromEvent(event).sheet.render(true);
    }

    // Delete the document.
    else if (control === "delete") {
      return this._getEntryFromEvent(event).deleteDialog();
    }

    // Toggle an ActiveEffect.
    else if (control === "toggle") {
      const entry = this._getEntryFromEvent(event);
      return entry.update({disabled: !entry.disabled});
    }

    // Toggle favoriting item.
    else if (control === "favorite") {
      return this._getEntryFromEvent(event).favorite();
    }

    // Use an item.
    else if (control === "use") {
      return this._getEntryFromEvent(event).use();
    }

    // Change loadout.
    else if (control === "change") {
      return this._onChangeItem(event);
    }
  }

  /**
   * Handle updating an item property via a change event.
   * @param {PointerEvent} event      The initiating change event.
   * @returns {Promise<ItemArtichron>}
   */
  async _onChangeManageItem(event) {
    const property = event.currentTarget.dataset.update;
    const id = event.currentTarget.closest("[data-item-id]").dataset.itemId;
    const item = this.document.items.get(id);
    const value = foundry.utils.getProperty(item.system, property);
    let tval = event.currentTarget.value;
    if (!tval.trim()) tval = null;
    else {
      if (/^[+-][0-9]+/.test(tval)) tval = Roll.safeEval(`${value} ${tval}`);
      if (event.currentTarget.max) tval = Math.min(parseInt(event.currentTarget.max), tval);
    }
    return item.update({[`system.${property}`]: tval});
  }

  /**
   * Handle changing the equipped item in a particular slot.
   * @param {PointerEvent} event      The initiating click event.
   * @returns {Promise<ActorArtichron|null>}
   */
  async _onChangeItem(event) {
    const [type, slot] = event.currentTarget.closest("[data-slot]").dataset.slot.split(".");

    let items;
    if (type === "armor") {
      items = this.document.items.filter(item => (item.type === "armor") && (item.system.category.subtype === slot));
    } else if ((type === "arsenal")) {
      items = this.document.items.filter(item => {
        if (!item.isArsenal) return false;
        const {first, second} = this.document.arsenal;
        if (slot === "first") return !second || (second !== item);
        if (slot === "second") return (!first || (first !== item)) && item.isOneHanded;
      });
    }
    if (!items?.length) {
      ui.notifications.warn("ARTICHRON.NoAvailableEquipment", {localize: true});
      return null;
    }

    const choices = items.reduce((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
    const hash = {selected: this.document.system.equipped[type][slot]?.id ?? null, sort: true, blank: ""};
    const options = HandlebarsHelpers.selectOptions(choices, {hash});
    return Dialog.prompt({
      rejectClose: false,
      label: game.i18n.localize("ARTICHRON.Equip"),
      content: `
      <form>
        <div class="form-group">
          <label>${game.i18n.localize("ARTICHRON.PickEquippedItem")}</label>
          <select>${options}</select>
        </div>
      </form>`,
      callback: ([html]) => {
        const id = html.querySelector("select").value || "";
        const item = this.document.items.get(id);
        const update = {[`system.equipped.${type}.${slot}`]: id};
        if ((type === "arsenal") && (slot === "first") && item && item.isTwoHanded) {
          update["system.equipped.arsenal.second"] = "";
        }
        return this.document.update(update);
      }
    });
  }

  /**
   * Handle click events on skill buttons.
   * @param {Event} event     Initiating click event.
   */
  async _onClickSkill(event) {
    const skillId = event.currentTarget.dataset.skill;
    return this.document.rollSkill(skillId);
  }

  /**
   * Render a configuration menu.
   * @param {PointerEvent} event      The initiating click event.
   * @returns
   */
  _onClickConfig(event) {
    const trait = event.currentTarget.dataset.trait;
    if (trait === "pools") return new PoolConfig({document: this.actor}).render(true);
    else if (trait === "skills") return new SkillConfig({document: this.actor}).render(true);
  }

  /**
   * Handle click events on any actor-related actions.
   * @param {PointerEvent} event      The initiating click event.
   */
  async _onClickManageActor(event) {
    switch (event.currentTarget.dataset.manage) {
      case "defend": return this.document.rollDefense();
      case "recover": return this.document.recover();
      case "pool": {
        const type = event.currentTarget.dataset.pool;
        return this.document.rollPool(type, {event});
      }
      case "damage": {
        const slot = event.currentTarget.closest("[data-arsenal]").dataset.arsenal;
        return this.document.rollDamage(slot, {event});
      }
      case "img": return this._onEditImg(event);
    }
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
