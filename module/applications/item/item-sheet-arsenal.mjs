import ItemSheetArtichron from "./item-sheet-base.mjs";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export default class ItemSheetArsenal extends ItemSheetArtichron {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 400,
      height: 500,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
      classes: ["arsenal", "sheet", "item", "artichron"]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const data = await super.getData();
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    // listeners that always work go here
    if (!this.isEditable) return;
    html[0].querySelectorAll(".damage .action[data-action]").forEach(n => {
      switch (n.dataset.action) {
        case "add": n.addEventListener("click", this._onClickAddDamage.bind(this)); break;
        case "del": n.addEventListener("click", this._onClickDelDamage.bind(this)); break;
      }
    });
  }

  async _onClickAddDamage(event) {
    const parts = this.document.toObject().system.damage.concat([{}]);
    return this.document.update({"system.damage": parts});
  }

  async _onClickDelDamage(event) {
    const idx = event.currentTarget.dataset.idx;
    const parts = this.document.toObject().system.damage;
    parts.splice(idx, 1);
    return this.document.update({"system.damage": parts});
  }
}
