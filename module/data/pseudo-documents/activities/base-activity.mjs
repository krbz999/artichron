import TypedPseudoDocument from "../typed-pseudo-document.mjs";

const {
  HTMLField, NumberField, SchemaField,
} = foundry.data.fields;

export default class BaseActivity extends TypedPseudoDocument {
  /** @type {import("../../../_types").PseudoDocumentMetadata} */
  static get metadata() {
    return {
      ...super.metadata,
      documentName: "Activity",
      defaultImage: "systems/artichron/assets/icons/pseudo/activity.svg",
      sheetClass: artichron.applications.sheets.pseudo.ActivitySheet,
      types: artichron.data.pseudoDocuments.activities,
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["ARTICHRON.ACTIVITY"];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      description: new HTMLField({ required: true }),
      cost: new SchemaField({
        value: new NumberField({ min: 0, integer: true, nullable: false, initial: 1 }),
      }),
    });
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The item on which this activity is embedded.
   * @type {foundry.documents.Item}
   */
  get item() {
    return this.document;
  }

  /* -------------------------------------------------- */

  /**
   * Does this activity place a measured template?
   * @type {boolean}
   */
  get hasTemplate() {
    return artichron.config.TARGET_TYPES[this.target?.type]?.isArea ?? false;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Prepare the base usage configs.
   * @param {object} [usageConfig]        Values to override in the usage config.
   * @param {object} [dialogConfig]       Values to override in the dialog config.
   * @param {object} [messageConfig]      Values to override in the message config.
   * @returns {{usage: object, dialog: object, message: object}}
   */
  getUsageConfigs(usageConfig = {}, dialogConfig = {}, messageConfig = {}) {
    const item = this.item;
    const isSpell = item.type === "spell";
    const message = {};

    const dialog = {
      template: {
        show: this.hasTemplate,
        canIncrease: isSpell,
        place: item.getFlag("artichron", `usage.${this.id}.template.place`) ?? true,
      },
      rollMode: {
        show: this.type === "healing",
        mode: item.getFlag("artichron", `usage.${this.id}.rollMode.mode`) ?? game.settings.get("core", "rollMode"),
      },
    };

    const usage = {
      template: {
        increase: 0,
        place: dialog.template.show && dialog.template.place,
      },
      rollMode: {
        mode: dialog.rollMode.mode,
      },
    };

    // Configuration required?
    dialog.configure = Object.values(dialog).some(u => u.show);

    foundry.utils.mergeObject(usage, usageConfig);
    foundry.utils.mergeObject(dialog, dialogConfig);
    foundry.utils.mergeObject(message, messageConfig);

    return { usage, dialog, message };
  }

  /* -------------------------------------------------- */

  /**
   * Configure the usage of this activity.
   * @param {object} [usage]        Values to override in the usage config.
   * @param {object} [dialog]       Values to override in the dialog config.
   * @param {object} [message]      Values to override in the message config.
   * @returns {Promise<{usage: object, dialog: object, message: object}>}
   */
  async configure(usage = {}, dialog = {}, message = {}) {
    // Skip dialog if shift is held.
    if (dialog.event?.shiftKey) {
      dialog.configure = false;
    }

    // Prepare configurations.
    const configs = this.getUsageConfigs(usage, dialog, message);
    return configs;
  }

  /* -------------------------------------------------- */

  /**
   * Use this activity.
   * @param {object} [usage]      Usage configuration.
   * @param {object} [dialog]     Dialog configuration.
   * @param {object} [message]    Message configuration.
   * @returns {Promise<ChatMessageArtichron|null>}
   * @abstract
   */
  async use(usage = {}, dialog = {}, message = {}) {}

  /* -------------------------------------------------- */

  /**
   * Consume the various properties when using this activity.
   * @param {object} [usage]
   * @returns {Promise}
   */
  async consume(usage = {}) {}

  /* -------------------------------------------------- */

  /**
   * Place measured templates.
   * @param {object} [config]               Configuration object.
   * @param {number} [config.increase]      The increase in size of the template.
   * @returns {Promise<MeasuredTemplate[]>}
   */
  async placeTemplate({ increase = 0 } = {}) {
    if (!this.hasTemplate) {
      ui.notifications.error("ARTICHRON.ACTIVITY.Warning.NoTemplates", { localize: true });
      return;
    }

    const initialLayer = canvas.activeLayer;
    const templateDatas = [];
    const token = this.item.token;

    const target = { ...this.target };
    if (target.type === "radius") target.count = 1;
    if (increase) target.size = target.size + increase;
    target.attach = artichron.config.TARGET_TYPES[target.type].isAttached;

    for (let i = 0; i < target.count; i++) {
      const templateData = await artichron.canvas.placement.TemplatePlacement.fromToken(token, target, {
        lock: true,
        templateData: templateDatas.at(-1),
      }).drawPreview();
      if (templateData) templateDatas.push(templateData);
      else break;
    }
    canvas.templates.clearPreviewContainer();

    // If in combat, flag these templates.
    if (this.item.actor.inCombat) {
      for (const data of templateDatas) {
        foundry.utils.mergeObject(data, {
          "flags.artichron.combat.id": game.combat.id,
          "flags.artichron.combat.end": this.target.duration,
        });
      }
    }

    const templates = await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", templateDatas);
    initialLayer.activate();
    return templates;
  }

  /* -------------------------------------------------- */

  /**
   * Create a roll data object.
   * @returns {object}      Roll data.
   */
  getRollData() {
    const rollData = this.item.getRollData();
    rollData.activity = { ...this };
    return rollData;
  }
}
