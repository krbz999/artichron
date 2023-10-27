/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export default class ItemSheetArtichron extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 400,
      height: 500,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
      classes: ["sheet", "item", "artichron"]
    });
  }

  /** @override */
  get template() {
    return `systems/artichron/templates/item/item-sheet-${this.document.type}.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const rollData = this.document.getRollData();
    const data = {
      item: this.document,
      actor: this.document.actor,
      system: this.document.system,
      context: {},
      rollData: rollData,
      config: CONFIG.SYSTEM,
      descriptions: {
        value: await TextEditor.enrichHTML(this.document.system.description.value, {rollData, async: true})
      },
      isArsenal: this.document.type === "arsenal",
      isArmor: this.document.type === "armor"
    };

    if (data.isArsenal) {
      data.context.categories = data.config.ARSENAL_TYPES;
      data.context.subtypes = data.config.ARSENAL_TYPES[this.document.system.type.category]?.items ?? {};
    } else if (data.isArmor) {
      data.context.categories = data.config.ARMOR_TYPES;
      data.context.resistanceOptions = Object.fromEntries(Object.entries(data.config.DAMAGE_TYPES).filter(([k, v]) => v.resist));
    }
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    // listeners that always work go here
    if (!this.isEditable) return;
    html[0].querySelectorAll("FIELDSET .action[data-action]").forEach(n => {
      switch(n.dataset.action) {
        case "add": n.addEventListener("click", this._onClickAddFieldset.bind(this)); break;
        case "del": n.addEventListener("click", this._onClickDelFieldSet.bind(this)); break;
      }
    });
  }

  /**
   * Append a new entry to an array within a fieldset.
   * @param {PointerEvent} event      The initiating click event.
   * @returns {Promise<ItemArtichron>}
   */
  async _onClickAddFieldset(event) {
    const prop = event.currentTarget.closest("FIELDSET").dataset.property;
    const parts = this.document.system.toObject()[prop].concat([{}]);
    return this.document.update({[`system.${prop}`]: parts});
  }

  /**
   * Remove an entry from an array within a fieldset.
   * @param {PointerEvent} event      The initiating click event.
   * @returns {Promise<ItemArtichron>}
   */
  async _onClickDelFieldSet(event) {
    const idx = event.currentTarget.dataset.idx;
    const prop = event.currentTarget.closest("FIELDSET").dataset.property;
    const parts = this.document.system.toObject()[prop];
    parts.splice(idx, 1);
    return this.document.update({[`system.${prop}`]: parts});
  }
}
