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

  async use() {
    if (this._targeting) return null; // Prevent initiating targeting twice.
    const isDamage = this.category.subtype === "offense";
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

    const configuration = await SpellcastingDialog.create({actor, item, damage: isDamage});
    if (!configuration) return null;

    const data = SpellcastingDialog.determineTemplateData(configuration);

    let targets = new Set();

    this._targeting = true;
    if (data.type !== "single") {
      // Case 1: Area of effect.
      const templates = await this.placeTemplates(data);
      await Promise.all(templates.map(template => template.waitForShape()));
      templates.forEach(template => template.object.containedTokens.forEach(tok => targets.add(tok)));
    } else {
      // Case 2: Singular targets.
      targets = await this.pickTarget({count: data.count, range: data.range});
    }
    delete this._targeting;

    if (data.mana) await actor.update({"system.pools.mana.value": actor.system.pools.mana.value - configuration.cost});

    if (isDamage) {
      // Offensive magic
      const part = item.system.damage[configuration.part];
      return new DamageRoll(configuration.formula, item.getRollData(), {type: part.type}).toMessage({
        speaker: ChatMessage.implementation.getSpeaker({actor: actor}),
        "flags.artichron.targets": Array.from(targets).map(target => target.uuid),
        "flags.artichron.templateData": (data.type !== "single") ? {
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
      return DamageRoll.toMessage([], {
        speaker: ChatMessage.implementation.getSpeaker({actor: actor}),
        "flags.artichron.targets": Array.from(targets).map(target => target.uuid),
        "flags.artichron.templateData": (data.type !== "single") ? {...data} : null,
        "system.actor": actor.uuid,
        "system.item": item.uuid
        //type: "effect"
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

  /**
   * Grant a buff to an actor.
   * @param {ActiveEffectArtichron} effect
   * @param {ActorArtichron} actor
   * @returns {Promise<ActiveEffectArtichron>}
   */
  static async grantBuff(effect, actor) {
    if (!actor.testUserPermission(game.user, "OWNER")) {
      throw new Error("You must be owner of the actor to grant it a buff!");
    }

    if (!(effect.type === "buff")) {
      throw new Error("The buff being granted is of the wrong type!");
    }

    if (!(effect.parent instanceof ItemArtichron)) {
      throw new Error("Buffs can only be granted by items!");
    }

    const effectData = foundry.utils.mergeObject(effect.toObject(), {
      "system.source": effect.parent.uuid,
      disabled: false
    });

    return ActiveEffectArtichron.create(effectData, {parent: actor});
  }

  async grantBuff() {
    const effects = this.parent.effects.filter(u => (u.type === "buff") && !u.transfer);
    if (effects.length === 1) return this.constructor.grantBuff(effects[0], actor);
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
