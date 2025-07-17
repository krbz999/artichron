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
   * Use this activity.
   * @returns {Promise<ChatMessageArtichron|null>}
   */
  async use() {}

  /* -------------------------------------------------- */

  /**
   * Place measured templates.
   * @returns {Promise<MeasuredTemplate[]>}
   */
  async placeTemplate() {
    if (!this.hasTemplate) {
      ui.notifications.error("ARTICHRON.ACTIVITY.Warning.NoTemplates", { localize: true });
      return;
    }

    const initialLayer = canvas.activeLayer;
    const templateDatas = [];
    const token = this.item.token;

    if (!token) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoToken", { localize: true });
      return;
    }

    const target = { ...this.target };
    if (target.type === "radius") target.count = 1;
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
