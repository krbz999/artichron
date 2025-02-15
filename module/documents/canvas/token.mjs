export default class TokenArtichron extends Token {
  /** @inheritdoc */
  _getAnimationTransition(options) {
    return foundry.canvas.rendering.filters.TextureTransitionFilter.TYPES.HOLOGRAM;
  }
}
