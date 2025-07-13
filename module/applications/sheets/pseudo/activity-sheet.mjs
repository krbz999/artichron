import PseudoDocumentSheet from "../../api/pseudo-document-sheet.mjs";

export default class ActivitySheet extends PseudoDocumentSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["activity"],
    window: {
      icon: "fa-solid fa-bolt-lightning",
    },
    actions: {
      addStatusOption: ActivitySheet.#addStatusOption,
      removeStatusOption: ActivitySheet.#removeStatusOption,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    identity: {
      template: "systems/artichron/templates/sheets/pseudo/activity/identity.hbs",
    },
    details: {
      template: "systems/artichron/templates/sheets/pseudo/activity/details.hbs",
      scrollable: [""],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "identity", icon: "fa-solid fa-tag" },
        { id: "details", icon: "fa-solid fa-pen-fancy" },
      ],
      initial: "identity",
      labelPrefix: "ARTICHRON.SHEET.TABS",
    },
  };

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextIdentity(context, options) {
    const a = context.pseudoDocument;
    context.ctx = {
      enriched: await foundry.applications.ux.TextEditor.implementation.enrichHTML(a.description, {
        rollData: a.getRollData(), relativeTo: context.document,
      }),
    };
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextDetails(context, options) {
    const ctx = context.ctx = {};

    ctx.showTarget = ["effect", "healing"].includes(context.pseudoDocument.type);

    // Target
    if (ctx.showTarget) {
      ctx.targetTypeOptions = artichron.config.TARGET_TYPES.optgroups;
      ctx.hasTemplate = context.pseudoDocument.hasTemplate;

      const scale = artichron.config.TARGET_TYPES[context.pseudoDocument.target.type]?.scale ?? new Set();
      ctx.showCount = scale.has("count");
      ctx.showSize = scale.has("size");
      ctx.showRange = scale.has("range");
      ctx.showWidth = scale.has("width");
    }

    // Effect
    if (context.pseudoDocument.type === "effect") {
      ctx.effectOptions = this.document.effects
        .filter(effect => !effect.transfer && ["condition", "buff"].includes(effect.type))
        .map(effect => ({ value: effect.id, label: effect.name }));

      ctx.statuses = Object.entries(context.pseudoDocument.effects.statuses).map(([status, obj]) => {
        const config = artichron.config.STATUS_CONDITIONS[status];
        return {
          status,
          label: config.name,
          rounds: {
            show: true,
            value: obj.rounds,
          },
          levels: {
            show: config.group === "leveled",
            value: obj.levels,
            max: config.levels,
          },
        };
      }, []);

      ctx.statusOptions = Object.entries(artichron.config.STATUS_CONDITIONS)
        .filter(([k, v]) => ["buff", "leveled"].includes(v.group) && !(k in context.pseudoDocument.effects.statuses))
        .map(([k, v]) => ({ value: k, label: v.name }));
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _syncPartState(partId, newElement, priorElement, state) {
    super._syncPartState(partId, newElement, priorElement, state);

    if (partId === "details") {
      const priorSelect = priorElement.querySelector(`#${this.id}-status-select`);
      const newSelect = newElement.querySelector(`#${this.id}-status-select`);
      if (priorSelect && newSelect?.querySelector(`OPTION[value="${priorSelect.value}"]`))
        newSelect.value = priorSelect.value;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Add a new status option.
   * @this {ActivitySheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #addStatusOption(event, target) {
    const status = this.element.querySelector(`#${this.id}-status-select`).value;
    this.pseudoDocument.update({ [`effects.statuses.${status}`]: { rounds: 2 } });
  }

  /* -------------------------------------------------- */

  /**
   * Remove a granted status.
   * @this {ActivitySheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #removeStatusOption(event, target) {
    const status = target.closest("[data-status]").dataset.status;
    this.pseudoDocument.update({ [`effects.statuses.-=${status}`]: null });
  }
}
