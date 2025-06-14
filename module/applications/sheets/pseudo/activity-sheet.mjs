import PseudoDocumentSheet from "../../api/pseudo-document-sheet.mjs";

export default class ActivitySheet extends PseudoDocumentSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["activity"],
    window: {
      icon: "fa-solid fa-bolt-lightning",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    ...super.PARTS,
    identity: {
      template: "systems/artichron/templates/sheets/pseudo/activity/identity.hbs",
    },
    details: {
      template: "systems/artichron/templates/sheets/pseudo/activity/details.hbs",
    },
  };

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The item that has this activity.
   * @type {foundry.documents.Item}
   */
  get item() {
    return this.document;
  }

  /* -------------------------------------------------- */

  /**
   * The activity.
   * @type {BaseActivity}
   */
  get activity() {
    return this.pseudoDocument;
  }

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
      ctx.effectOptions = this.item.transferrableEffects.map(effect => {
        return { value: effect.id, label: effect.name };
      });
    }

    return context;
  }
}
