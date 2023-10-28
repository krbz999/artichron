import ActorSheetArtichron from "./actor-sheet-base.mjs";

/**
 * Extend the base Artichron actor sheet.
 * @extends {ActorSheetArtichron}
 */
export default class ActorSheetHero extends ActorSheetArtichron {

  /** @override */
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes.push("hero");
    return options;
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
