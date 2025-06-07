import Application from "../../api/application.mjs";

/**
 * @extends Application
 */
export default class PathConfigurationDialog extends Application {
  constructor({ document, ...options } = {}) {
    if (!document) {
      throw new Error(`A ${PathConfigurationDialog.name} was constructed without a Document!`);
    }

    super(options);
    this.#document = document;
    this.#clone = document.clone({}, { keepId: true });
  }

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

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextPaths(context, options) {
    context.ctx = {};

    const clone = this.#clone.system.progression;
    const document = this.#document.system.progression;

    const path = this.#clone.system.currentPath;
    const [, primary, secondary] = this.#document.system.currentPaths;

    // Current path (possibly mixed).
    const current = {
      ...(path in artichron.config.PROGRESSION_MIXED_PATHS)
        ? artichron.config.PROGRESSION_MIXED_PATHS[path]
        : artichron.config.PROGRESSION_CORE_PATHS[path],
    };
    current.item = await fromUuid(current.uuid);

    // Primary path (the one with most investment).
    const primaryPath = {
      key: primary,
      allocated: (clone.paths[primary]?.invested ?? 0) - (document.paths[primary]?.invested ?? 0),
      invested: document.paths[primary]?.invested ?? 0,
      ...artichron.config.PROGRESSION_CORE_PATHS[primary] ?? {},
    };
    primaryPath.item = await fromUuid(primaryPath.uuid);

    // Secondary path (the one with least investment).
    const secondaryPath = {
      key: secondary,
      allocated: (clone.paths[secondary]?.invested ?? 0) - (document.paths[secondary]?.invested ?? 0),
      invested: document.paths[secondary]?.invested ?? 0,
      ...artichron.config.PROGRESSION_CORE_PATHS[secondary] ?? {},
    };
    secondaryPath.item = await fromUuid(secondaryPath.uuid);

    // Remaining points to allocate.
    const points = {
      remaining: clone.points.value,
    };
    points.remaining -= primaryPath.allocated;
    points.remaining -= secondaryPath.allocated;

    Object.assign(context.ctx, {
      points, current,
      primary: primaryPath,
      secondary: secondaryPath,
    });

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
  _processSubmitData(event, form, formData, submitOptions) {
    const newPaths = this.#clone.system.toObject().progression.paths;
    const oldPaths = this.#document.system.toObject().progression.paths;
    const config = {};
    for (const k in newPaths) {
      config[k] = newPaths[k].invested - (oldPaths[k]?.invested ?? 0);
    }
    return config;
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
}
