export default class CombatTrackerArtichron extends foundry.applications.sidebar.tabs.CombatTracker {
  /** @inheritdoc */
  async render(options = {}, _options = {}) {
    if (foundry.utils.getType(options) === "boolean") {
      _options.force = options;
      options = _options;
    }
    const result = await super.render(options);
    ui.carousel.render({ force: options.force });
    return result;
  }
}
