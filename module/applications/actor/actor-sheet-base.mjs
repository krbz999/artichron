import config from "./configs/base-config.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export default class ActorSheetArtichron extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 500,
      height: 500,
      top: 100,
      left: 200,
      tabs: [
        {navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes", group: "primary"},
        {navSelector: "[data-tab=inventory] > .inventory.tabs[data-group=inventory]", contentSelector: ".tab.inventory", initial: "arsenal", group: "inventory"},
        {navSelector: "[data-tab=consumables] > .inventory.tabs[data-group=inventory]", contentSelector: ".tab.consumables", initial: "food", group: "consumables"}
      ],
      classes: ["sheet", "actor", "artichron"],
      resizable: false
    });
  }

  /** @override */
  get template() {
    return `systems/artichron/templates/actor/actor-sheet-${this.document.type}.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData(options = {}) {
    const data = {
      actor: this.document,
      system: this.document.system,
      context: {
        equipped: this._prepareEquipment(),
        resistances: this._prepareResistances(),
        items: this._prepareItems()
      },
      rollData: this.document.getRollData(),
      config: CONFIG.SYSTEM
    };
    return data;
  }

  /**
   * Prepare the items for rendering.
   * @returns {object[]}
   */
  _prepareItems() {
    const types = this.document.itemTypes;
    const map = key => ({key: key, items: types[key], label: `TYPES.Item.${key}Pl`});
    return {
      inventory: ["arsenal", "armor", "part"].map(map),
      consumable: ["food", "elixir"].map(map)
    };
  }

  /**
   * Prepare resistances for rendering.
   * @returns {object}
   */
  _prepareResistances() {
    const res = this.document.system.resistances;
    const resistances = {};
    for (const r in res) {
      resistances[r] = {
        ...CONFIG.SYSTEM.DAMAGE_TYPES[r],
        total: res[r].total,
        bonus: res[r].bonus
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
        action: "change-item",
        roll: main ? "first" : null,
        slot: "arsenal.first"
      }
    });

    // Secondary weapon.
    const disableSecond = main && main.isTwoHanded;
    const cssClass = [
      "weapon",
      "second",
      disableSecond ? "empty" : second ? null : "empty",
      disableSecond ? "disabled" : null
    ].filterJoin(" ");
    equipped.push({
      cssClass: cssClass,
      item: disableSecond ? null : second,
      img: disableSecond ? main.img : second ? second.img : emptySlotIcons.arsenal,
      tooltip: disableSecond ? null : second ? second.name : "ARTICHRON.EquipItem",
      data: {
        "item-id": (!disableSecond && second) ? second.id : null,
        action: disableSecond ? null : "change-item",
        roll: disableSecond ? null : "second",
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
          action: "change-item",
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

    // listeners that always work go here
    html[0].querySelectorAll("[type=text], [type=number]").forEach(n => {
      if (n.classList.contains("delta")) n.addEventListener("change", this._onChangeDelta.bind(this));
      n.addEventListener("focus", event => event.currentTarget.select());
    });

    if (!this.isEditable) return;

    // listeners that only work on editable or owned sheets go here
    html[0].querySelectorAll("[data-action]").forEach(n => {
      const action = n.dataset.action;
      if (action === "edit-item") n.addEventListener("click", this._onClickRenderItemSheet.bind(this));
      else if (action === "change-item") n.addEventListener("contextmenu", this._onRightClickChangeItem.bind(this));
      else if (action === "roll-item") n.addEventListener("click", this._onClickRollItem.bind(this));
      else if (action === "toggle-config") n.addEventListener("click", this._onClickConfig.bind(this));
      else if (action === "roll-pool") n.addEventListener("click", this._onClickRollPool.bind(this));
    });
    html[0].querySelectorAll("[data-roll]").forEach(n => n.addEventListener("click", this._onClickRollItem.bind(this)));
  }

  /**
   * Handle rolling attack/damage with a weapon.
   * @param {PointerEvent} event      The initiating click event.
   */
  async _onClickRollItem(event) {
    const slot = event.currentTarget.dataset.roll;
    return this.document.rollDamage(slot, {event});
  }

  /**
   * Allow for deltas in input fields.
   * @param {PointerEvent} event      The initiating change event.
   */
  _onChangeDelta(event) {
    const target = event.currentTarget;
    const value = target.value;
    const prop = foundry.utils.getProperty(this.document, target.name);
    if (/^[+-][0-9]+/.test(value)) target.value = Roll.safeEval(`${prop} ${value}`);
  }

  /**
   * Handle clicking a pool's label to roll a die.
   * @param {PointerEvent} event
   */
  async _onClickRollPool(event) {
    const type = event.currentTarget.dataset.pool;
    return this.actor.rollPool(type, {event});
  }

  /**
   * Handle clicking an edit button to render an item's sheet.
   * @param {PointerEvent} event      The initiating click event.
   * @returns {ItemSheet}             The sheet of the item.
   */
  async _onClickRenderItemSheet(event) {
    const id = event.currentTarget.closest("[data-item-id]").dataset.itemId;
    const item = this.document.items.get(id);
    return item.sheet.render(true);
  }

  /**
   * Handle changing the equipped item in a particular slot.
   * @param {PointerEvent} event      The initiating click event.
   * @returns {Promise<ActorArtichron|null>}
   */
  async _onRightClickChangeItem(event) {
    const [type, slot] = event.currentTarget.closest("[data-slot]").dataset.slot.split(".");

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

  /** @override */
  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();
    buttons.unshift({
      label: "ARTICHRON.Opacity",
      class: "opacity",
      icon: "fa-solid",
      onclick: this._onToggleOpacity
    });
    return buttons;
  }

  /**
   * Toggle the opacity class on this application.
   * @param {PointerEvent} event
   */
  _onToggleOpacity(event) {
    event.currentTarget.closest(".app").classList.toggle("opacity");
  }

  /** @override */
  setPosition(pos = {}) {
    if (!pos.height && !this._minimized) pos.height = "auto";
    return super.setPosition(pos);
  }
}
