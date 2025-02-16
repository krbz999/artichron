/**
 * Context menu class for any Artichron-specific behavior.
 */
export default class ContextMenuArtichron extends foundry.applications.ui.ContextMenu {
  constructor(container, selector, menuItems, options = {}) {
    options.jQuery ??= false;
    options.fixed ??= true;
    super(container, selector, menuItems, options);
  }
}
