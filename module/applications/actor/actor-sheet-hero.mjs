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
    html = html[0];
    if (!this.isEditable) return;
  }

}
