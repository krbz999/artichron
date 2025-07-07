import Application from "../../api/application.mjs";

export default class ItemFusionDialog extends Application {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["fusion"],
    window: {
      title: "ARTICHRON.ItemFusionDialog.Title",
      icon: "fa-solid fa-volcano",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    selections: {
      template: "systems/artichron/templates/apps/item/item-fusion-dialog/selections.hbs",
    },
    indicators: {
      template: "systems/artichron/templates/apps/item/item-fusion-dialog/indicators.hbs",
    },
    changes: {
      template: "systems/artichron/templates/apps/item/item-fusion-dialog/changes.hbs",
    },
    footer: {
      template: "systems/artichron/templates/shared/footer.hbs",
    },
  };

  /* -------------------------------------------------- */

  /**
   * @class
   * @param {object} options                Application rendering options.
   * @param {ItemArtichron} options.item    The item being fused onto another.
   */
  constructor({ item, ...options }) {
    super(options);
    this.#item = item;
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The item being fused onto another.
   * @type {ItemArtichron}
   */
  #item = null;

  /* -------------------------------------------------- */

  /**
   * Track the selected target item.
   * @type {string}
   */
  #selectedTarget = null;

  /* -------------------------------------------------- */

  /**
   * Track the selected fusion.
   * @type {string}
   */
  #selectedFusion = "default";

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return game.i18n.format(this.options.window.title, { source: this.#item.name });
  }

  /* -------------------------------------------------- */
  /*   Rendering                                        */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);

    if (partId === "selections") {
      htmlElement.querySelectorAll("[data-change]").forEach(n => {
        n.addEventListener("change", (event) => {
          const change = event.currentTarget.dataset.change;
          const value = event.currentTarget.value;
          if (change === "target") this.#selectedTarget = value;
          else if (change === "fusion") this.#selectedFusion = value;
          else return;
          this.render({ parts: ["indicators", "changes", "footer"] });
        });
      });
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if (partId === "selections") {
      const { StringField } = foundry.data.fields;

      // Target.
      const tChoices = {};
      for (const item of this.#item.actor.items) {
        if (item === this.#item) continue;
        if (this.#item.type === item.type) tChoices[item.id] = item.name;
      }
      context.target = {
        field: new StringField({
          choices: tChoices,
          label: "ARTICHRON.ItemFusionDialog.TargetLabel",
        }),
        dataset: { change: "target" },
      };

      // Fusion.
      const eChoices = {
        default: "ARTICHRON.ItemFusionDialog.Default",
      };
      for (const effect of this.#item.effects) {
        if (effect.isTransferrableFusion) eChoices[effect.id] = effect.name;
      }
      context.fusion = {
        field: new StringField({
          choices: eChoices,
          label: "ARTICHRON.ItemFusionDialog.FusionLabel",
          required: true,
        }),
        dataset: { change: "fusion" },
      };
    } else if (partId === "indicators") {
      const target = this.#item.actor.items.get(this.#selectedTarget);
      context.targetImage = target?.img ?? Item.implementation.getDefaultArtwork({}).img;
      context.sourceImage = this.#item.img;
      context.targetDisabled = !target;
    } else if (partId === "changes") {
      const effect = this.#item.effects.get(this.#selectedFusion) ?? new ActiveEffect.implementation({
        type: "fusion",
        name: game.i18n.format("ARTICHRON.ItemFusionDialog.DefaultFusion", { name: this.#item.name }),
        img: this.#item.img,
      }, { parent: this.#item });
      const target = this.#item.actor.items.get(this.#selectedTarget);
      const changes = (target && effect) ? target.system.fusion.createFusionTranslation(effect) : [];
      context.changes = [];
      for (let { path, label, oldValue, newValue } of changes) {
        label = game.i18n.localize(label);
        if (["Set", "Array"].includes(foundry.utils.getType(newValue))) {
          oldValue = effect.system.constructor.translateChange({
            key: path,
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: oldValue,
          });
          newValue = effect.system.constructor.translateChange({
            key: path,
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: newValue,
          });
        }
        context.changes.push({ label, oldValue, newValue });
      }
    } else if (partId === "footer") {
      context.footer = {
        disabled: !this.#item.actor.items.get(this.#selectedTarget)
        || ((this.#selectedFusion !== "default") && !this.#item.effects.get(this.#selectedFusion)),
        label: "ARTICHRON.ItemFusionDialog.Fuse",
      };
    }
    return context;
  }

  /* -------------------------------------------------- */
  /*   Event Handlers                                   */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  _processSubmitData(event, form, formData, submitOptions) {
    return { itemId: this.#selectedTarget, effectId: this.#selectedFusion };
  }
}
