import SpellUseDialog from "../../applications/item/spell-use-dialog.mjs";
import ActiveEffectArtichron from "../effect/active-effect.mjs";
import EffectBuffData from "../effect/system-model.mjs";
import MeasuredTemplateArtichron from "../template/template.mjs";
import ArsenalData from "./item-arsenal.mjs";

const {NumberField, SchemaField, StringField, SetField} = foundry.data.fields;

export default class SpellData extends ArsenalData {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    type: "spell",
    defaultWeight: 1
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      template: new SchemaField({
        types: new SetField(new StringField({
          required: true,
          choices: CONFIG.SYSTEM.AREA_TARGET_TYPES
        }))
      }),
      category: new SchemaField({
        subtype: new StringField({required: true, initial: "offense", choices: CONFIG.SYSTEM.SPELL_TYPES})
      }),
      cost: new SchemaField({
        value: new NumberField({min: 0, initial: 2, nullable: false})
      })
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  static get BONUS_FIELDS() {
    const bonus = super.BONUS_FIELDS;
    bonus.add("system.template.types");
    return bonus;
  }

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ItemProperty.SpellProperty"
  ];

  /* -------------------------------------------------- */

  /** @override */
  async use() {
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

    if (!this.canUsePips) {
      ui.notifications.warn("ARTICHRON.Warning.MissingActionPoints", {localize: true});
      return null;
    }

    const configuration = await SpellUseDialog.create(this.parent);
    if (!configuration) return null;

    const data = SpellUseDialog.determineTemplateData(configuration);

    const flags = {artichron: {usage: {}}};

    if (data.type !== "single") {
      flags.artichron.usage.templates = {
        ...data
      };
    } else {
      // Case 2: Singular targets.
      flags.artichron.usage.target = {
        count: data.count,
        range: data.range
      };
    }

    // Create and perform updates.
    const actorUpdate = {};
    const itemUpdates = [];
    const actor = this.parent.actor;

    for (const id of configuration.boosters) {
      const elixir = actor.items.get(id);
      const update = elixir.system._usageUpdate();
      itemUpdates.push(update);
      configuration.cost--;
    }

    if (configuration.cost && (actor.type === "hero")) {
      const mana = actor.system.pools.mana.value;
      actorUpdate["system.pools.mana.value"] = mana - configuration.cost;
    }

    const messageData = {
      type: "usage",
      speaker: ChatMessage.implementation.getSpeaker({actor: actor}),
      "system.item": this.parent.uuid,
      flags: flags
    };

    if (this.category.subtype === "offense") {
      messageData.flags.artichron.usage.damage = {
        ids: [configuration.damage],
        addition: configuration.additional
      };
    } else if (this.category.subtype === "buff") {
      messageData.flags.artichron.usage.effect = {
        uuid: this.parent.effects.get(configuration.buff).uuid
      };
    }

    await Promise.all([
      foundry.utils.isEmpty(actorUpdate) ? null : actor.update(actorUpdate),
      foundry.utils.isEmpty(itemUpdates) ? null : actor.updateEmbeddedDocuments("Item", itemUpdates)
    ]);

    if (actor.inCombat) {
      await actor.spendActionPoints(this.parent.system.cost.value);
    }

    return ChatMessage.implementation.create(messageData);
  }

  /* -------------------------------------------------- */

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

  /* -------------------------------------------------- */
  /*   Buff magic                                       */
  /* -------------------------------------------------- */

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

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * Does this item have any valid template or targeting types?
   * @type {boolean}
   */
  get hasTemplate() {
    return this.template.types.size > 0;
  }

  /* -------------------------------------------------- */

  /** @override */
  get _damages() {
    if (this.category.subtype !== "offense") return [];
    return super._damages;
  }

  /* -------------------------------------------------- */
  /*   Tooltips                                         */
  /* -------------------------------------------------- */

  /** @override */
  async _prepareTooltipContext() {
    const context = await super._prepareTooltipContext();

    if (this.category.subtype === "offense") {
      context.damages = this._damages.map(k => {
        return {
          formula: Roll.create(k.formula, context.rollData).formula,
          config: CONFIG.SYSTEM.DAMAGE_TYPES[k.type]
        };
      });

      context.bonuses = Object.entries(this.damage.bonuses).reduce((acc, [type, {value}]) => {
        if (value) acc.push({
          value: value,
          config: CONFIG.SYSTEM.DAMAGE_TYPES[type]
        });
        return acc;
      }, []);
    }

    context.targets = this.template.types.reduce((acc, type) => {
      const label = CONFIG.SYSTEM.AREA_TARGET_TYPES[type]?.label;
      if (label) acc.push({label: label});
      return acc;
    }, []);

    return context;
  }
}
