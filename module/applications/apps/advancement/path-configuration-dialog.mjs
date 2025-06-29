import Application from "../../api/application.mjs";

/**
 * @extends Application
 */
export default class PathConfigurationDialog extends Application {
  constructor({ additional = [], document, ...options } = {}) {
    if (!document) {
      throw new Error(`A ${PathConfigurationDialog.name} was constructed without an Actor!`);
    }
    super(options);
    this.#document = document;
    for (const k of additional) {
      if (k in document.system.progression.paths) continue;
      if (Object.keys(document.system.progression.paths).length >= 2) continue;
      if (!(k in artichron.config.PROGRESSION_CORE_PATHS)) continue;
      this.#investment[k] = 1;
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    actions: {
      investPoint: PathConfigurationDialog.#investPoint,
      removePoint: PathConfigurationDialog.#removePoint,
    },
    classes: ["path-configuration-dialog"],
    position: {
      width: 800,
      height: "auto",
    },
    window: {},
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    header: {
      template: "systems/artichron/templates/apps/advancement/path-configuration-dialog/header.hbs",
    },
    progresses: {
      template: "systems/artichron/templates/apps/advancement/path-configuration-dialog/progresses.hbs",
    },
    paths: {
      template: "systems/artichron/templates/apps/advancement/path-configuration-dialog/paths.hbs",
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  /* -------------------------------------------------- */

  /**
   * The actor having paths configured.
   * @type {foundry.documents.Actor}
   */
  #document;

  /* -------------------------------------------------- */

  /**
   * The allocated investment.
   * @type {Record<string, number>}
   */
  #investment = {};

  /* -------------------------------------------------- */

  /**
   * Cached items for easier retrieval.
   * @type {Record<string, foundry.documents.Item>}
   */
  #cachedItems = {};

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("ARTICHRON.PROGRESSION.PATH_CONFIGURATION.title", { name: this.#document.name });
  }

  /* -------------------------------------------------- */

  /**
   * Helper method to retrieve a path item from the actor or from the config.
   * @param {string} path                               The path identifier.
   * @returns {Promise<foundry.documents.Item|null>}    A promise that resolves to the retrieved or cached item.
   */
  async #getItem(path) {
    if (!path) return null;

    let item = this.#cachedItems[path];
    if (item) return item;

    let uuid;
    if (path in artichron.config.PROGRESSION_MIXED_PATHS) uuid = artichron.config.PROGRESSION_MIXED_PATHS[path].uuid;
    else uuid = artichron.config.PROGRESSION_CORE_PATHS[path]?.uuid;

    item = await fromUuid(uuid);
    if (!item) return null;

    return this.#cachedItems[path] = item;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.cachedItems = {};
    for (const k of this.#document.items.documentsByType.path) context.cachedItems[k.identifier] = k;
    for (const k in this.#investment) {
      if (!(k in context.cachedItems)) {
        const item = await this.#getItem(k);
        context.cachedItems[k] = item;
      }
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextHeader(context, options) {
    const ctx = context.ctx = {};

    ctx.oldPath = this.#document.system.progression.label
      || game.i18n.localize("ARTICHRON.PROGRESSION.PATH_CONFIGURATION.noPath");

    const invested = foundry.utils.deepClone(this.#document.system.progression.invested ?? {});
    for (const k in this.#investment) {
      if (k in invested) invested[k] += this.#investment[k];
      else invested[k] = this.#investment[k];
    }
    const newPath = artichron.data.actors.HeroData.getPath(invested);
    ctx.newPath = (await this.#getItem(newPath))?.name
      || game.i18n.localize("ARTICHRON.PROGRESSION.PATH_CONFIGURATION.noPath");

    const rom = obj => artichron.utils.romanize(Object.values(obj).reduce((acc, i) => acc + i, 0));
    ctx.totals = {
      prev: rom(this.#document.system.progression.invested ?? {}),
      next: rom(invested),
    };

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextProgresses(context, options) {
    const ctx = context.ctx = {};
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextPaths(context, options) {
    const ctx = context.ctx = {};

    const document = this.#document.system.progression;
    const investedPoints = Array.from(new Set([...Object.keys(document.invested ?? {}), ...Object.keys(this.#investment)]));
    const defaultArt = foundry.utils.getDocumentClass("Item").getDefaultArtwork({ type: "path" }).img;

    const makeContext = async (key) => {
      const allocated = this.#investment[key] ?? 0;
      const item = await this.#getItem(key);
      const image = item ? item.img : defaultArt;
      const disabled = !item || !key;

      const ctx = {
        key, allocated, item, image, disabled,
        invested: (document.invested?.[key] ?? 0) + allocated,
        ...artichron.config.PROGRESSION_CORE_PATHS[key] ?? {},
      };

      return ctx;
    };

    ctx.primary = await makeContext(investedPoints.shift());
    ctx.secondary = await makeContext(investedPoints.shift());

    // Remaining points to allocate.
    ctx.allocated = ctx.primary.allocated + ctx.secondary.allocated;
    ctx.points = { remaining: document.points.value - ctx.allocated };

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextFooter(context, options) {
    const ctx = context.ctx = {};
    context.buttons = [{ type: "submit", label: "Confirm", icon: "fa-solid fa-circle-nodes" }];
    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    const drop = new foundry.applications.ux.DragDrop.implementation({
      dropSelector: "[data-drop-area]",
      callbacks: {
        drop: this.#onDropItem.bind(this),
      },
    });
    drop.bind(this.element);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _processSubmitData(event, form, formData, submitOptions) {
    const config = Object.fromEntries(Object.entries(this.#investment).filter(k => k[1] > 0));
    return foundry.utils.isEmpty(config) ? null : config;
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Allocate a point to a path.
   * @this {PathConfigurationDialog}
   * @param {PointerEvent} event          The initiating click event.
   * @param {HTMLButtonElement} target    The capturing HTML element which defined a [data-action].
   */
  static #investPoint(event, target) {
    target.disabled = true;
    const path = target.closest("[data-path]").dataset.path;
    this.#investment[path] = (this.#investment[path] ?? 0) + 1;
    this.render();
  }

  /* -------------------------------------------------- */

  /**
   * Remove a point from a path.
   * @this {PathConfigurationDialog}
   * @param {PointerEvent} event          The initiating click event.
   * @param {HTMLButtonElement} target    The capturing HTML element which defined a [data-action].
   */
  static #removePoint(event, target) {
    target.disabled = true;
    const path = target.closest("[data-path]").dataset.path;
    this.#investment[path]--;
    if (!this.#investment[path]) delete this.#investment[path];
    this.render();
  }

  /* -------------------------------------------------- */

  /**
   * Handle drop events when a path item is added to the application.
   * @param {DragEvent} event   The initiating drag event.
   */
  async #onDropItem(event) {
    const item = await fromUuid(foundry.applications.ux.TextEditor.implementation.getDragEventData(event).uuid);
    if (item?.type !== "path") return;
    const id = item.identifier;
    if (!(id in artichron.config.PROGRESSION_CORE_PATHS)) return;
    if (id in this.#investment) return;
    this.#investment[id] = 1;
    this.render();
  }
}
