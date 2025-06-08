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

    // Current path (possibly mixed).
    const current = {
      ...(path in artichron.config.PROGRESSION_MIXED_PATHS)
        ? artichron.config.PROGRESSION_MIXED_PATHS[path]
        : artichron.config.PROGRESSION_CORE_PATHS[path],
    };
    current.item = await fromUuid(current.uuid);
    current.label ??= game.i18n.localize("ARTICHRON.PROGRESSION.PATH_CONFIGURATION.noPath");

    const defaultArt = foundry.utils.getDocumentClass("Item").getDefaultArtwork({ type: "path" }).img;

    // Primary path (the one with most investment).
    const primary = {
      key: primaryPath,
      allocated: (clone.paths[primaryPath]?.invested ?? 0) - (document.paths[primaryPath]?.invested ?? 0),
      invested: clone.paths[primaryPath]?.invested ?? 0,
      ...artichron.config.PROGRESSION_CORE_PATHS[primaryPath] ?? {},
    };
    primary.item = await fromUuid(primary.uuid);
    primary.image = primary.item ? primary.item.img : defaultArt;
    primary.disabled = !primary.item || !primary.key;

    // Secondary path (the one with least investment and might not exist).
    const secondary = {
      key: secondaryPath,
      allocated: (clone.paths[secondaryPath]?.invested ?? 0) - (document.paths[secondaryPath]?.invested ?? 0),
      invested: clone.paths[secondaryPath]?.invested ?? 0,
      ...artichron.config.PROGRESSION_CORE_PATHS[secondaryPath] ?? {},
    };
    secondary.item = await fromUuid(secondary.uuid);
    secondary.image = secondary.item ? secondary.item.img : defaultArt;
    secondary.disabled = !secondary.item || !secondary.key;

    // Remaining points to allocate.
    const points = {
      remaining: clone.points.value,
    };
    points.remaining -= primary.allocated;
    points.remaining -= secondary.allocated;

    Object.assign(context.ctx, { points, current, primary, secondary });

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
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #investPoint(event, target) {
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
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #removePoint(event, target) {
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
