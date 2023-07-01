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
  async getData() {
    const data = {
      actor: this.document,
      context: {},
      rollData: this.document.getRollData(),
      config: CONFIG.SYSTEM
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
      if (res[r].resistant) {
        data.context.resistances[r] = {...CONFIG.SYSTEM.DAMAGE_TYPES[r], total: res[r].total};
      }
    }

    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // listeners that always work go here

    if (!this.isEditable) return;

    // listeners that only work on editable or owned sheets go here
    html[0].querySelectorAll("[data-action]").forEach(n => {
      const action = n.dataset.action;
      switch (action) {
        case "edit-item":
          n.addEventListener("click", this._onClickRenderItemSheet.bind(this));
          break;
        case "change-item":
          n.addEventListener("click", this._onClickChangeItem.bind(this));
          break;
        default:
          break;
      }
    });
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
  async _onClickChangeItem(event){
    const slot = event.currentTarget.dataset.slot;
    const currentId = event.currentTarget.dataset.id;
    // only works for weapons atm
    if(!event.currentTarget.closest(".items").classList.contains("arsenal")) return;
    const items = this.document.items.filter(item => {
      return ["weapon", "spell", "shield"].includes(item.type) && !Object.values(this.document.arsenal).map(u => u?.id).includes(item.id);
    });
    console.warn({items});
    console.warn({slot});

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
}
