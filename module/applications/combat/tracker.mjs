const renderCarousel = foundry.utils.debounce(ct => ct.apps?.[0]?.render(), 150);

export default class CombatTrackerArtichron extends CombatTracker {
  /** @override */
  render(...args) {
    const result = super.render(...args);
    renderCarousel(this);
    return result;
  }
}
