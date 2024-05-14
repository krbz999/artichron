import SpellcastingDialog from "../../applications/chat/spellcasting-dialog.mjs";
import {DamageRoll} from "../../dice/damage-roll.mjs";
import ActorArtichron from "../actor/actor.mjs";
import ActiveEffectArtichron from "../effect/active-effect.mjs";
import {EffectBuffData} from "../effect/system-model.mjs";
import MeasuredTemplateArtichron from "../template/template.mjs";
import ArsenalData from "./item-arsenal.mjs";
import ItemArtichron from "./item.mjs";

const {NumberField, SchemaField, StringField, SetField} = foundry.data.fields;

export default class SpellData extends ArsenalData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      template: new SchemaField({
        types: new SetField(new StringField({required: true, choices: Object.keys(CONFIG.SYSTEM.SPELL_TARGET_TYPES)})),
        rating: new NumberField({integer: true, min: 0})
      })
    };
  }

  /** @override */
  get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "system.template.rating"
    ]));
  }

  /** @override */
  async use() {
    if (this._targeting) return null; // Prevent initiating targeting twice.
    const isDamage = this.category.subtype === "offense";
    const isBuff = this.category.subtype === "buff";
    const item = this.parent;
    const actor = item.actor;

    if (isDamage && !this.hasDamage) {
      ui.notifications.warn("ARTICHRON.Warning.ItemHasNoDamageRolls", {localize: true});
      return null;
    }

    if (!item.isEquipped) {
      ui.notifications.warn("ARTICHRON.Warning.ItemIsNotEquipped", {localize: true});
      return null;
    }

    if (!this.hasTemplate) {
      ui.notifications.warn("ARTICHRON.Warning.ItemHasNoTemplateTypes", {localize: true});
      return null;
    }

    const configuration = await SpellcastingDialog.create({actor, item, damage: isDamage, isBuff: isBuff});
    if (!configuration) return null;

    const data = SpellcastingDialog.determineTemplateData(configuration);

    const targets = new Set();

    this._targeting = true;
    if (data.type !== "single") {
      // Case 1: Area of effect.
      const templates = await this.placeTemplates(data);
      await Promise.all(templates.map(template => template.waitForShape()));
      for (const template of templates) {
        for (const token of template.object.containedTokens) {
          const actor = token.actor;
          if (actor) targets.add(actor);
        }
      }
    } else {
      // Case 2: Singular targets.
      const tokens = await this.pickTarget({count: data.count, range: data.range});
      for (const token of tokens) {
        const actor = token.actor;
        if (actor) targets.add(actor);
      }
    }
    delete this._targeting;

    if (data.mana) await actor.update({"system.pools.mana.value": actor.system.pools.mana.value - configuration.cost});

    if (isDamage) {
      // Offensive magic
      const part = item.system.damage[configuration.part];
      return new DamageRoll(configuration.formula, item.getRollData(), {type: part.type}).toMessage({
        speaker: ChatMessage.implementation.getSpeaker({actor: actor}),
        "flags.artichron.use.targetUuids": Array.from(targets).map(target => target.uuid),
        "flags.artichron.use.templateData": (data.type !== "single") ? {
          ...data,
          formula: configuration.formula,
          damageType: part.type
        } : null,
        "system.actor": actor.uuid,
        "system.item": item.uuid,
        type: "damage"
      });
    } else {
      // Buff or Defensive magic
      const speaker = ChatMessage.implementation.getSpeaker({actor: actor});
      const templateData = (data.type !== "single") ? {...data} : null;
      const effectId = configuration.effectId;
      const effect = this.parent.effects.get(effectId);
      return ChatMessage.implementation.create({
        "flags.artichron.use.targetUuids": Array.from(targets).map(target => target.uuid),
        "flags.artichron.use.templateData": templateData,
        "flags.artichron.use.effectUuid": effect.uuid,
        "system.actor": actor.uuid,
        "system.item": item.uuid,
        speaker: speaker,
        content: await renderTemplate("systems/artichron/templates/chat/damage-roll.hbs", {
          templateData, effectId, targets
        })
      });
    }
  }

  /**
   * Prompt for placing templates using this item.
   * @param {object} config     Template configuration and placement data.
   * @returns {Promise<MeasuredTemplateArtichron[]>}
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
