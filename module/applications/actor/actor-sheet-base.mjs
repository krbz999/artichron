import {PoolConfig} from "./configs/pool-config.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export default class ActorSheetArtichron extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 600,
      height: 600,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes"}],
      classes: ["sheet", "actor", "artichron"]
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
      context: {},
      rollData: this.document.getRollData(),
      config: CONFIG.SYSTEM,
      editing: this._editing ?? false
    };

    // Context: empty slot icons.
    data.context.emptySlotIcons = {
      arsenal: "icons/weapons/axes/axe-broad-brown.webp",
      head: "icons/equipment/head/helm-barbute-brown-tan.webp",
      chest: "icons/equipment/chest/breastplate-leather-brown-belted.webp",
      arms: "icons/equipment/hand/glove-ringed-cloth-brown.webp",
      legs: "icons/equipment/leg/pants-breeches-leather-brown.webp",
      accessory: "icons/equipment/neck/choker-simple-bone-fangs.webp"
    };

    // Context: resistances.
    const res = this.document.system.resistances;
    data.context.resistances = {};
    for (const r in res) {
      data.context.resistances[r] = {
        ...CONFIG.SYSTEM.DAMAGE_TYPES[r],
        total: res[r].total,
        bonus: res[r].bonus
      };
    }

    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // listeners that always work go here
    html[0].querySelectorAll("[type=text], [type=number]").forEach(n => {
      n.addEventListener("focus", event => event.currentTarget.select());
    });

    if (!this.isEditable) return;

    // listeners that only work on editable or owned sheets go here
    html[0].querySelectorAll("[data-action]").forEach(n => {
      const action = n.dataset.action;
      if (action === "edit-item") n.addEventListener("click", this._onClickRenderItemSheet.bind(this));
      else if (action === "change-item") n.addEventListener("click", this._onClickChangeItem.bind(this));
      else if (action === "toggle-editing") n.addEventListener("click", this._onClickToggleEdit.bind(this));
      else if (action === "toggle-config") n.addEventListener("click", this._onClickConfig.bind(this));
      else if (action === "roll-pool") n.addEventListener("click", this._onClickRollPool.bind(this));
    });
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
    const id = event.currentTarget.dataset.id;
    const item = this.document.items.get(id);
    return item.sheet.render(true);
  }

  /**
   * Handle changing the equipped item in a particular slot.
   * @param {PointerEvent} event      The initiating click event.
   * @returns {Actor}                 The owning actor updated to have a new item equipped.
   */
  async _onClickChangeItem(event) {
    const slot = event.currentTarget.dataset.slot;
    const currentId = event.currentTarget.dataset.id;
    // only works for weapons atm
    if (!event.currentTarget.closest(".items").classList.contains("arsenal")) return;
    const items = this.document.items.filter(item => {
      return ["weapon", "spell", "shield"].includes(item.type) && !Object.values(this.document.arsenal).map(u => u?.id).includes(item.id);
    });

    const options = items.reduce((acc, item) => {
      return acc + `<option value="${item.id}">${item.name}</option>`;
    }, "");
    return Dialog.prompt({
      content: `
      <form>
        <div class="form-group">
          <label>pick weapon</label>
          <select>${options}</select>
        </div>
      </form>`,
      callback: ([html]) => {
        const id = html.querySelector("select").value;
        return this.document.update({[`system.equipped.arsenal.${slot}`]: id});
      }
    });
  }

  /**
   * Re-render the sheet in a mode that edits hidden values.
   * @param {PointerEvent} event      The initiating click event.
   * @returns {ActorSheetArtichron}
   */
  _onClickToggleEdit(event) {
    return this.render(false, {editing: true});
  }

  /**
   * Render a configuration menu.
   * @param {PointerEvent} event      The initiating click event.
   * @returns
   */
  _onClickConfig(event) {
    const config = event.currentTarget.dataset.config;
    if (config === "pools") return new PoolConfig(this.actor).render(true);
  }

  /** @override */
  render(force = false, options = {}) {
    this._editing = options.editing ?? false;
    return super.render(force, options);
  }
}
