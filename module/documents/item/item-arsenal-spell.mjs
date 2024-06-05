import SpellUseDialog from "../../applications/item/spell-use-dialog.mjs";
import {DamageRoll} from "../../dice/damage-roll.mjs";
import ActiveEffectArtichron from "../effect/active-effect.mjs";
import {EffectBuffData} from "../effect/system-model.mjs";
import MeasuredTemplateArtichron from "../template/template.mjs";
import ArsenalData from "./item-arsenal.mjs";

const {SchemaField, StringField, SetField} = foundry.data.fields;

export default class SpellData extends ArsenalData {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    defaultIcon: "icons/svg/book.svg"
  }, {inplace: false}));

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      template: new SchemaField({
        types: new SetField(new StringField({
          required: true,
          choices: CONFIG.SYSTEM.AREA_TARGET_TYPES
        }), {
          label: "ARTICHRON.ItemProperty.Template.Types",
          hint: "ARTICHRON.ItemProperty.Template.TypesHint"
        })
      }),
      category: new SchemaField({
        subtype: new StringField({
          label: "ARTICHRON.ItemProperty.Category.SubtypeSpell",
          hint: "ARTICHRON.ItemProperty.Category.SubtypeSpellHint",
          choices: CONFIG.SYSTEM.SPELL_TYPES
        })
      })
    };
  }

  /** @override */
  get BONUS_FIELDS() {
    return super.BONUS_FIELDS;
  }

  /** @override */
  async use() {
    if (this._targeting) return null; // Prevent initiating targeting twice.

    if ((this.category.subtype === "offense") && !this.hasDamage) {
      ui.notifications.warn("ARTICHRON.Warning.ItemHasNoDamageRolls", {localize: true});
      return null;
    }

    if (!this.parent.isEquipped) {
      ui.notifications.warn("ARTICHRON.Warning.ItemIsNotEquipped", {localize: true});
      return null;
    }

    if (!this.hasTemplate) {
      ui.notifications.warn("ARTICHRON.Warning.ItemHasNoTemplateTypes", {localize: true});
      return null;
    }

    const configuration = await SpellUseDialog.create(this.parent);
    if (!configuration) return null;

    const data = SpellUseDialog.determineTemplateData(configuration);

    const targets = new Set();

    this._targeting = true;
    if (data.type !== "single") {
      // Case 1: Area of effect.
      const templates = await this.placeTemplates(data);
      await Promise.all(templates.map(template => template.waitForShape()));
      for (const template of templates) {
        for (const token of template.object.containedTokens) {
          const actor = token.actor;
          if (actor) targets.add(actor.uuid);
        }
      }
    } else {
      // Case 2: Singular targets.
      const tokens = await this.pickTarget({count: data.count, range: data.range});
      for (const token of tokens) {
        const actor = token.actor;
        if (actor) targets.add(actor.uuid);
      }
    }
    delete this._targeting;

    if (configuration.cost) {
      const actor = this.parent.actor;
      await actor.update({"system.pools.mana.value": actor.system.pools.mana.value - configuration.cost});
    }

    const messageData = {targets: Array.from(targets)};
    if (configuration.shape !== "single") messageData.template = data;

    if (this.category.subtype === "offense") {
      // Offensive magic
      const {formula, type} = this.damage.parts.find(d => d.id === configuration.damage);
      const rollData = this.parent.getRollData();
      const roll = new DamageRoll(formula, rollData, {type: type}).alter(configuration.multiplier || 1, 0);
      messageData.rolls = [roll];
    } else if (this.category.subtype === "buff") {
      // Buff or Defensive magic
      const effectId = configuration.buff;
      const effect = this.parent.effects.get(effectId);
      messageData.effectUuid = effect.uuid;
    }

    return this.toMessage(messageData);
  }

  /**
   * Prompt for placing templates using this item.
   * @param {object} config     Template configuration and placement data.
   * @returns {Promise<MeasuredTemplateDocumentArtichron[]>}
   */
  async placeTemplates(config) {
    if (!this.hasTemplate) {
      throw new Error("This item cannot create measured templates!");
    }

    const initialLayer = canvas.activeLayer;
    const templateDatas = [];
    const token = this.parent.token;
    for (let i = 0; i < config.count; i++) {
      const templateData = await MeasuredTemplateArtichron.fromToken(token, config, {
        lock: true,
        templateData: templateDatas.at(-1)
      }).drawPreview();
      if (templateData) templateDatas.push(templateData);
      else break;
    }
    canvas.templates.clearPreviewContainer();
    const templates = await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", templateDatas);
    initialLayer.activate();
    return templates;
  }

  /* ---------------------------------------- */
  /*                Buff Magic                */
  /* ---------------------------------------- */

  /**
   * Retrieve all buff effects that were created by this item.
   * @returns {Set<ActiveEffectArtichron>}
   */
  getBuffs() {
    const uuids = EffectBuffData.origins.get(this.parent.uuid) ?? new Set();
    return uuids.reduce((acc, uuid) => {
      if (uuid.startsWith("Compendium.")) return acc;
      const buff = fromUuidSync(uuid);
      if (buff) acc.add(buff);
      return acc;
    }, new Set());
  }

  /* ---------------------------------------- */
  /*                Properties                */
  /* ---------------------------------------- */

  /**
   * Does this item have any valid template or targeting types?
   * @type {boolean}
   */
  get hasTemplate() {
    return this.template.types.size > 0;
  }
}
