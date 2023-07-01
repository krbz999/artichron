import ActorSheetArtichron from "./actor-sheet-base.mjs";

/**
 * Extend the base Artichron actor sheet.
 * @extends {ActorSheetArtichron}
 */
export default class ActorSheetMonster extends ActorSheetArtichron {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 600,
      height: 600,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes"}],
      classes: ["monster", "sheet", "actor", "artichron"]
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
    // listeners that only work on editable or owned sheets go here
  }

}
