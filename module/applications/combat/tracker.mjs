const renderCarousel = foundry.utils.debounce(ct => ct.apps?.[0]?.render(), 150);

export default class CombatTrackerArtichron extends foundry.applications.sidebar.tabs.CombatTracker {
  /** @override */
  async render(...args) {
    const result = await super.render(...args);
    renderCarousel(this);
    return result;
  }
}
