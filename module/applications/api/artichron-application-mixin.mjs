const { HandlebarsApplicationMixin, Application } = foundry.applications.api;

/**
 * Application mixin to add common features shared by all system-specific applications.
 * Feature set:
 * - Opacity toggle.
 * - Splitting part contect preparation into underscored functions (and warning if some are missing).
 * - Tabbed navigation sidding on the right side of the frame.
 * - Standardized context menu handler.
 * @template {Function} Application
 * @param {Application} Class
 */
export default function ArtichronApplicationMixin(Class) {
  return class ArtichronApplication extends HandlebarsApplicationMixin(Class) {
    /** @inheritdoc */
    static DEFAULT_OPTIONS = {
      actions: {
        toggleOpacity: ArtichronApplication.#toggleOpacity,
      },
      classes: ["artichron"],
      window: {
        contentClasses: ["standard-form"],
      },
    };

    /* -------------------------------------------------- */

    /**
     * Is opacity enabled?
     * @type {boolean}
     */
    #opacity = false;

    /* -------------------------------------------------- */

    /** @inheritdoc */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      return Object.assign(context, {
        config: artichron.config,
        isGM: game.user.isGM,
      });
    }

    /* -------------------------------------------------- */

    /** @inheritdoc */
    async _preparePartContext(partId, context, options) {
      context = await super._preparePartContext(partId, context, options);

      const fn = `_preparePartContext${partId.capitalize()}`;
      if (!(this[fn] instanceof Function)) {
        throw new Error(`The [${this.constructor.name}] application does not implement the [${fn}] method.`);
      }

      return this[fn](context, options);
    }

    /* -------------------------------------------------- */

    /** @type {import("../../_types").ContextPartHandler} */
    async _preparePartContextTabs(context, options) {
      context.verticalTabs = true;
      context.ctx = {};
      return context;
    }

    /* -------------------------------------------------- */

    /** @inheritdoc */
    _prepareTabs(group) {
      const tabs = super._prepareTabs(group);

      for (const k in tabs) {
        tabs[k] = {
          ...tabs[k],
          tooltip: tabs[k].label,
        };
        delete tabs[k].label;
      }

      return tabs;
    }

    /* -------------------------------------------------- */

    /** @inheritdoc */
    async _renderFrame(options) {
      const frame = await super._renderFrame(options);
      if (this.#opacity) frame.classList.add("opacity");
      this.window.controls.insertAdjacentHTML("afterend", `
      <button type="button" class="header-control icon fa-solid" data-action="toggleOpacity" data-tooltip="ARTICHRON.SHEET.TOGGLE.opacity"></button>
        `);
      return frame;
    }

    /* -------------------------------------------------- */

    /** @inheritdoc */
    _createContextMenu(handler, selector, { hookName, ...options } = {}) {
      return super._createContextMenu(handler, selector, {
        hookName,
        parentClassHooks: false,
        hookResponse: true,
        ...options,
      });
    }

    /* -------------------------------------------------- */
    /*   Event handlers                                   */
    /* -------------------------------------------------- */

    /**
     * Handle toggling the opacity lock of the application.
     * @this {DocumentSheetArtichron}
     * @param {PointerEvent} event    The initiating click event.
     * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
     */
    static #toggleOpacity(event, target) {
      this.#opacity = target.closest(".application").classList.toggle("opacity");
    }
  };
}
