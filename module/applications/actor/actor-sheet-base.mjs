import {ArtichronSheetMixin} from "../base-sheet.mjs";
import config from "./configs/base-config.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export default class ActorSheetArtichron extends ArtichronSheetMixin(ActorSheet) {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 500,
      height: 600,
      top: 100,
      left: 200,
      tabs: [
        {navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes", group: "primary"},
        {navSelector: "[data-tab=inventory] > .inventory.tabs[data-group=inventory]", contentSelector: ".tab.inventory", initial: "arsenal", group: "inventory"},
        {navSelector: "[data-tab=consumables] > .inventory.tabs[data-group=inventory]", contentSelector: ".tab.consumables", initial: "food", group: "consumables"},
        {navSelector: "[data-tab=effects] > .effects.tabs[data-group=effects]", contentSelector: ".tab.effects", initial: "active", group: "effects"}
      ],
      classes: ["sheet", "actor", "artichron"],
      resizable: false,
      scrollY: [".equipped-items", ".items-list"]
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
    return {height: Math.clamped(hp.value / hp.max, 0, 1) * 100};
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
      return {...pool, key: key, value: pool.value || 0, die: pool.die};
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
      key: key, items: types[key].map(item => {
        return {item: item, favorited: this.document.system.equipped.favorites.has(item)};
      }), label: `TYPES.Item.${key}Pl`
    });
    return {
      inventory: ["arsenal", "armor", "part"].map(map),
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
    const max = Math.max(...Object.values(res).map(r => r.total));
    const resistances = {};
    for (const r in res) {
      resistances[r] = {
        ...CONFIG.SYSTEM.DAMAGE_TYPES[r],
        total: res[r].total,
        height: Math.round((res[r].total / max) * 100)
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
      data: {
        "item-id": main ? main.id : null,
        action: "manage",
        manage: "damage",
        arsenal: main ? "first" : null,
        slot: "arsenal.first",
        context: "equipped"
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
      data: {
        "item-id": (!disableSecond && second) ? second.id : null,
        action: disableSecond ? null : "manage",
        manage: disableSecond ? null : "damage",
        arsenal: disableSecond ? null : "second",
        slot: disableSecond ? null : "arsenal.second",
        context: disableSecond ? null : "equipped"
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
          action: "change-item",
          slot: `armor.${key}`,
          context: "equipped"
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
    });

    // Context menus.
    new ContextMenu(html, "[data-context]", [], {onOpen: this._onContext.bind(this)});
  }

  /**
   * Handle opening of a context menu.
   * @param {HTMLElement} element     The element the menu opens on.
   */
  async _onContext(element) {
    const ctx = element.dataset.context;
    switch (ctx) {
      case "equipped":
        const id = element.closest("[data-item-id]")?.dataset.itemId;
        const item = this.document.items.get(id);
        ui.context.menuItems = [{
          name: "ARTICHRON.EditItem",
          icon: "<i class='fa-solid fa-edit'></i>",
          condition: () => !!item,
          callback: () => item.sheet.render(true)
        }, {
          name: "ARTICHRON.ChangeItem",
          icon: "<i class='fa-solid fa-shield'></i>",
          callback: this._onChangeItem.bind(this, element)
        }];
    }
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
      let type, disabled;
      if (embeddedName === "items") type = event.currentTarget.closest("[data-item-type]").dataset.itemType;
      if (embeddedName === "effects") disabled = event.currentTarget.closest("[data-active]").dataset.active === "inactive";
      return collection.documentClass.create({
        name: name,
        img: img,
        icon: embeddedName === "effects" ? img : undefined,
        type: type,
        disabled: disabled
      }, {parent: this.document, renderSheet: true});
    }

    // Show the document's sheet.
    else if (control === "edit") {
      const data = event.currentTarget.closest("[data-item-id]").dataset;
      const parent = data.parentId ? this.document.items.get(data.parentId) : this.document;
      return parent.getEmbeddedCollection(embeddedName).get(data.itemId).sheet.render(true);
    }

    // Delete the document.
    else if (control === "delete") {
      const data = event.currentTarget.closest("[data-item-id]").dataset;
      const parent = data.parentId ? this.document.items.get(data.parentId) : this.document;
      return parent.getEmbeddedCollection(embeddedName).get(data.itemId).deleteDialog();
    }

    // Toggle an ActiveEffect.
    else if (control === "toggle") {
      const data = event.currentTarget.closest("[data-item-id]").dataset;
      const parent = data.parentId ? this.document.items.get(data.parentId) : this.document;
      const item = parent.getEmbeddedCollection(embeddedName).get(data.itemId);
      return item.update({disabled: !item.disabled});
    }

    // Toggle favoriting item.
    else if (control === "favorite") {
      const id = event.currentTarget.closest("[data-item-id]").dataset.itemId;
      const item = this.document.items.get(id);
      return item.favorite();
    }
  }

  /**
   * Handle changing the equipped item in a particular slot.
   * @param {HTMLElement} element     The element that triggered the contextmenu.
   * @returns {Promise<ActorArtichron|null>}
   */
  async _onChangeItem(element) {
    const [type, slot] = element.closest("[data-slot]").dataset.slot.split(".");

    let items;
    if (type === "armor") {
      items = this.document.items.filter(item => (item.type === "armor") && (item.system.type.category === slot));
    } else if (type === "arsenal") {
      items = this.document.items.filter(item => {
        if (item.type !== "arsenal") return false;
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
          update[`system.equipped.arsenal.second`] = "";
        }
        return this.document.update(update);
      }
    });
  }

  /**
   * Render a configuration menu.
   * @param {PointerEvent} event      The initiating click event.
   * @returns
   */
  _onClickConfig(event) {
    const trait = event.currentTarget.dataset.trait;
    return new config(this.actor, {trait}).render(true);
  }

  /**
   * Handle click events on any actor-related actions.
   * @param {PointerEvent} event      The initiating click event.
   */
  async _onClickManageActor(event) {
    switch (event.currentTarget.dataset.manage) {
      case "defend": return this.document.rollDefense();
      case "recover": return this.document.recover();
      case "pool":
        const type = event.currentTarget.dataset.pool;
        return this.document.rollPool(type, {event});
      case "damage":
        const slot = event.currentTarget.dataset.arsenal;
        return this.document.rollDamage(slot, {event});
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
