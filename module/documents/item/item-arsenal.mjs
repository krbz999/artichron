import SpellcastingDialog from "../../applications/chat/spellcasting-dialog.mjs";
import {DamageRoll} from "../../dice/damage-roll.mjs";
import {SYSTEM} from "../../helpers/config.mjs";
import {DamageDiceModel, DefenseDiceModel} from "../fields/die.mjs";
import MeasuredTemplateArtichron from "../template/template.mjs";
import {ItemSystemModel} from "./system-model.mjs";
import * as utils from "../../helpers/utils.mjs";

const {ArrayField, NumberField, SchemaField, StringField, EmbeddedDataField, SetField} = foundry.data.fields;

export default class ArsenalData extends ItemSystemModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      damage: new ArrayField(new EmbeddedDataField(DamageDiceModel)),
      parry: new EmbeddedDataField(DefenseDiceModel),
      block: new EmbeddedDataField(DefenseDiceModel),
      wield: new SchemaField({
        value: new NumberField({choices: [1, 2], initial: 1}),
        range: new NumberField({integer: true, min: 0})
      }),
      armor: new SchemaField({
        value: new NumberField({integer: true, min: 0})
      }),
      cost: new SchemaField({
        value: new NumberField({integer: true, min: 0}),
        type: new StringField({choices: ["health", "stamina", "mana"]})
      }),
      template: new SchemaField({
        types: new SetField(new StringField({required: true, choices: Object.keys(SYSTEM.SPELL_TARGET_TYPES)})),
        rating: new NumberField({integer: true, min: 0})
      })
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    const rollData = this.parent.getRollData();
    ["parry", "block"].forEach(v => this[v].prepareDerivedData(rollData));
    this.damage.forEach(v => v.prepareDerivedData(rollData));
  }

  /** @override */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "parry.number", "parry.faces",
      "block.number", "block.faces",
      "wield.range",
      "armor.value",
      "cost.value",
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

    if (this.isSpell) {
      if (!this.template.types.size) {
        ui.notifications.warn("ARTICHRON.Warning.ItemHasNoTemplateTypes", {localize: true});
        return null;
      }

      const configuration = await SpellcastingDialog.create(actor, item);
      if (!configuration) return null;
      const [token] = actor.isToken ? [actor.token?.object] : actor.getActiveTokens();

      const data = SpellcastingDialog.determineTemplateData(configuration);
      const part = item.system.damage[configuration.part];

      let template;
      let targets;

      if (data.type !== "single") {
        // Case 1: Area of effect.
        template = await MeasuredTemplateArtichron.fromToken(token, data).drawPreview();
        if (!template) return null;
        await new Promise(r => setTimeout(r, 100));
        targets = utils.getTokenTargets(utils.tokensInTemplate(template.object));
      } else {
        // Case 2: Singular targets.
        targets = await utils.awaitTargets(data.count, {origin: token, range: data.range});
      }
      await actor.update({"system.pools.mana.value": actor.system.pools.mana.value - configuration.cost});
      return new DamageRoll(configuration.formula, item.getRollData(), {type: part.type}).toMessage({
        speaker: ChatMessage.implementation.getSpeaker({actor: actor}),
        "flags.artichron.targets": targets?.map(target => target.uuid)
      });
    } else {
      const inCombat = actor.inCombat;
      if (inCombat) {
        const combatant = game.combat.getCombatantByActor(actor);
        const pips = combatant.pips;
        const cost = this.isOneHanded ? 1 : this.isTwoHanded ? 2 : 0;
        if (cost > pips) {
          ui.notifications.warn("ARTICHRON.Warning.NotEnoughPips", {localize: true});
          return null;
        }

        await combatant.setFlag("artichron", "pips", pips - cost);
      }

      return actor.rollDamage(key);
    }
  }

  /**
   * Is this one- or two-handed, melee or ranged?
   * @type {boolean}
   */
  get isOneHanded() {
    return this.wield.value === 1;
  }
  get isTwoHanded() {
    return this.wield.value === 2;
  }
  get isMelee() {
    return this.type.category === "melee";
  }
  get isRanged() {
    return this.type.category === "ranged";
  }
  get isSpell() {
    return this.type.category === "spell";
  }
  get isShield() {
    return this.type.category === "shield";
  }
}
