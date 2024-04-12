import SpellcastingDialog from "../../applications/chat/spellcasting-dialog.mjs";
import {DamageRoll} from "../../dice/damage-roll.mjs";
import {SYSTEM} from "../../helpers/config.mjs";
import MeasuredTemplateArtichron from "../template/template.mjs";
import * as utils from "../../helpers/utils.mjs";
import ArsenalData from "./item-arsenal.mjs";

const {NumberField, SchemaField, StringField, SetField} = foundry.data.fields;

export default class SpellData extends ArsenalData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      template: new SchemaField({
        types: new SetField(new StringField({required: true, choices: Object.keys(SYSTEM.SPELL_TARGET_TYPES)})),
        rating: new NumberField({integer: true, min: 0})
      })
    };
  }

  prepareDerivedData() {
    const rollData = super.prepareDerivedData();
  }

  /** @override */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "template.distance", "template.width", "template.angle"
    ]));
  }

  async use() {
    const item = this.parent;
    const actor = item.actor;

    const {first, second} = actor.arsenal;
    const key = (first === item) ? "first" : (second === item) ? "second" : null;
    if (!key) {
      ui.notifications.warn("ARTICHRON.Warning.ItemIsNotEquipped", {localize: true});
      return null;
    }

    if (!this.template.types.size) {
      ui.notifications.warn("ARTICHRON.Warning.ItemHasNoTemplateTypes", {localize: true});
      return null;
    }

    const configuration = await SpellcastingDialog.create(actor, item);
    if (!configuration) return null;
    const [token] = actor.isToken ? [actor.token?.object] : actor.getActiveTokens();

    const data = SpellcastingDialog.determineTemplateData(configuration);
    const part = item.system.damage[configuration.part];

    let targets = new Set();

    if (data.type !== "single") {
      // Case 1: Area of effect.
      const initialLayer = canvas.activeLayer;
      const templateDatas = [];
      for (let i = 0; i < data.count; i++) {
        const templateData = await this._createTemplate(data, {lock: true});
        if (templateData) templateDatas.push(templateData);
        else break;
      }
      canvas.templates.clearPreviewContainer();
      const templates = await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", templateDatas);
      await Promise.all(templates.map(template => template.waitForShape()));
      templates.forEach(template => template.object.containedTokens.forEach(tok => targets.add(tok)));
      initialLayer.activate();
    } else {
      // Case 2: Singular targets.
      targets = await utils.awaitTargets(data.count, {origin: token, range: data.range});
    }
    if (data.mana) await actor.update({"system.pools.mana.value": actor.system.pools.mana.value - configuration.cost});
    return new DamageRoll(configuration.formula, item.getRollData(), {type: part.type}).toMessage({
      speaker: ChatMessage.implementation.getSpeaker({actor: actor}),
      "flags.artichron.targets": Array.from(targets ?? []).map(target => target.uuid),
      "flags.artichron.templateData": (data.type !== "single") ? {
        ...data,
        formula: configuration.formula,
        damageType: part.type
      } : null,
      "flags.artichron.actorUuid": actor.uuid,
      "flags.artichron.itemUuid": item.uuid
    });
  }

  async _createTemplate(templateData, options = {}) {
    return MeasuredTemplateArtichron.fromToken(this.parent.token, templateData, options).drawPreview();
  }
}
