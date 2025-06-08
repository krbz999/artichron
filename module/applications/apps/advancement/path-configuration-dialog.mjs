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

    const actorUpdate = {};
    for (const k of additional) {
      if (k in document.system.progression.paths) continue;
      if (Object.keys(document.system.progression.paths).length >= 2) continue;
      if (!(k in artichron.config.PROGRESSION_CORE_PATHS)) continue;
      actorUpdate[`system.progression.paths.${k}.invested`] = 0;
    }
    this.#clone = document.clone(actorUpdate, { keepId: true });
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
   * A clone of the actor that can be modified as needed.
   * @type {foundry.documents.Actor}
   */
  #clone;

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format("ARTICHRON.PROGRESSION.PATH_CONFIGURATION.title", { name: this.#document.name });
  }

  /* -------------------------------------------------- */

  /**
   * Helper method to retrieve a path item from the config.
   * @param {string} path                               The path identifier.
   * @returns {Promise<foundry.documents.Item|null>}    A promise that resolves to the retrieved or cached item.
   */
  async #getItem(path) {
    if (!path) return null;
    if (this.#cachedItems[path]) return this.#cachedItems[path];

    let uuid;
    if (path in artichron.config.PROGRESSION_MIXED_PATHS) uuid = artichron.config.PROGRESSION_MIXED_PATHS[path].uuid;
    else uuid = artichron.config.PROGRESSION_CORE_PATHS[path]?.uuid;

    const item = await fromUuid(uuid);
    if (!item) return null;

    return this.#cachedItems[path] = item;
  }

  /* -------------------------------------------------- */

  /**
   * Cache of retrieved path items.
   * @type {Record<string, foundry.documents.Item>}
   */
  #cachedItems = {};

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextHeader(context, options) {
    context.ctx = {};

    const clone = this.#clone.system.progression;
    const [current, primaryPath, secondaryPath] = this.#clone.system.currentPaths;
    const total = clone.paths[primaryPath]?.invested + (clone.paths[secondaryPath]?.invested ?? 0);
    const item = total ? await this.#getItem(current) : null;

    const label = item && total
      ? `${item.name} (${artichron.utils.romanize(total)})`
      : game.i18n.localize("ARTICHRON.PROGRESSION.PATH_CONFIGURATION.noPath");
    const image = total && item ? item.img : foundry.utils.getDocumentClass("Item").getDefaultArtwork({ type: "path" }).img;
    Object.assign(context.ctx, { label, image });

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextProgresses(context, options) {
    context.ctx = {};

    const [current, primaryPath, secondaryPath] = this.#clone.system.currentPaths;
    if (!primaryPath) return context;

    const bars = context.ctx.progresses = [];
    const paths = new Set();
    const mixed = current in artichron.config.PROGRESSION_MIXED_PATHS
      ? current
      : artichron.config.PROGRESSION_CORE_PATHS[primaryPath].mixed[secondaryPath];

    if (mixed) paths.add(mixed);
    paths.add(primaryPath);
    if (secondaryPath) paths.add(secondaryPath);

    for (const path of paths) {
      const config = path in artichron.config.PROGRESSION_CORE_PATHS
        ? artichron.config.PROGRESSION_CORE_PATHS[path]
        : artichron.config.PROGRESSION_MIXED_PATHS[path];
      const color = foundry.utils.Color.fromRGB([Math.random(), Math.random(), Math.random()]).css;
      const fill = Math.ceil(Math.random() * 100);
      bars.push({ path, color, fill, label: config.label });
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextPaths(context, options) {
    context.ctx = {};

    const clone = this.#clone.system.progression;
    const document = this.#document.system.progression;

    const [path, ...rest] = this.#clone.system.currentPaths;
    if (rest.filter(_ => _).length === 2) {
      // Ensure paths don't jump around due to investments.
      rest.sort((a, b) => a.localeCompare(b));
    }
    const [primaryPath, secondaryPath] = rest;

    const defaultArt = foundry.utils.getDocumentClass("Item").getDefaultArtwork({ type: "path" }).img;

    // Primary path (the one with most investment).
    const primary = {
      key: primaryPath,
      allocated: (clone.paths[primaryPath]?.invested ?? 0) - (document.paths[primaryPath]?.invested ?? 0),
      invested: clone.paths[primaryPath]?.invested ?? 0,
      ...artichron.config.PROGRESSION_CORE_PATHS[primaryPath] ?? {},
    };
    primary.item = await this.#getItem(primaryPath);
    primary.image = primary.item ? primary.item.img : defaultArt;
    primary.disabled = !primary.item || !primary.key;

    // Secondary path (the one with least investment and might not exist).
    const secondary = {
      key: secondaryPath,
      allocated: (clone.paths[secondaryPath]?.invested ?? 0) - (document.paths[secondaryPath]?.invested ?? 0),
      invested: clone.paths[secondaryPath]?.invested ?? 0,
      ...artichron.config.PROGRESSION_CORE_PATHS[secondaryPath] ?? {},
    };
    secondary.item = await this.#getItem(secondaryPath);
    secondary.image = secondary.item ? secondary.item.img : defaultArt;
    secondary.disabled = !secondary.item || !secondary.key;

    // Remaining points to allocate.
    const points = {
      remaining: clone.points.value,
    };
    points.remaining -= primary.allocated;
    points.remaining -= secondary.allocated;

    Object.assign(context.ctx, { points, primary, secondary });

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextFooter(context, options) {
    context.ctx = {};
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
    const newPaths = this.#clone.system.toObject().progression.paths;
    const oldPaths = this.#document.system.toObject().progression.paths;
    const config = {};
    for (const k in newPaths)
      if (newPaths[k].invested) {
        const invested = newPaths[k].invested - (oldPaths[k]?.invested ?? 0);
        if (invested > 0) config[k] = invested;
      }
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
    this.#clone.updateSource({
      [`system.progression.paths.${path}.invested`]: this.#clone.system.progression.paths[path].invested + 1,
    });
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
    this.#clone.updateSource({
      [`system.progression.paths.${path}.invested`]: this.#clone.system.progression.paths[path].invested - 1,
    });
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
    const id = item.system.identifier;
    if (!(id in artichron.config.PROGRESSION_CORE_PATHS)) return;
    if (id in this.#clone.system.progression.paths) return;
    this.#clone.updateSource({ [`system.progression.paths.${id}.invested`]: 0 });
    this.render();
  }
}
