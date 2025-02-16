export default class TokenArtichron extends foundry.canvas.placeables.Token {
  /** @inheritdoc */
  _getAnimationTransition(options) {
    return foundry.canvas.rendering.filters.TextureTransitionFilter.TYPES.HOLOGRAM;
  }
}
