import ActivitySheet from "../../applications/activity-sheet.mjs";

/**
 * @typedef {object} ActivityMetadata     Activity metadata.
 * @property {string} type                The activity type.
 * @property {string} label               Name of this activity type.
 */

const {ArrayField, BooleanField, HTMLField, NumberField, SchemaField, SetField, StringField} = foundry.data.fields;

const targetField = () => {
  return new SchemaField({
    type: new StringField({
      choices: CONFIG.SYSTEM.TARGET_TYPES,
      initial: "single",
      required: true
    }),
    count: new NumberField({min: 1, integer: true, nullable: false, initial: 1}),
    duration: new StringField({
      choices: CONFIG.SYSTEM.TEMPLATE_DURATIONS,
      initial: "combat",
      required: true
    }),
    range: new NumberField({min: 1, integer: true, nullable: false, initial: 1}),
    size: new NumberField({min: 1, integer: true, nullable: false, initial: 1}),
    width: new NumberField({min: 1, integer: true, nullable: false, initial: 1})
  });
};

export default class BaseActivity extends foundry.abstract.DataModel {
  /**
   * Activity metadata.
   * @type {ActivityMetadata}
   */
  static metadata = Object.freeze({
    type: "",
    label: ""
  });

  /* -------------------------------------------------- */

  /**
   * The different available activity types.
   * @type {Record<string, BaseActivity>}
   */
  static get TYPES() {
    return {
      [DamageActivity.metadata.type]: DamageActivity,
      [DefendActivity.metadata.type]: DefendActivity,
      [EffectActivity.metadata.type]: EffectActivity,
      [HealingActivity.metadata.type]: HealingActivity,
      [TeleportActivity.metadata.type]: TeleportActivity
    };
  }

  /* -------------------------------------------------- */

  /**
   * Registered sheets.
   * @type {Map<string, ApplicationV2>}
   */
  static #sheets = new Map();

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["ARTICHRON.ACTIVITY"];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      _id: new StringField({
        initial: () => foundry.utils.randomID(),
        required: true,
        blank: false,
        readonly: true
      }),
      type: new StringField({
        initial: () => this.metadata.type,
        required: true,
        blank: false,
        readonly: true,
        validate: (value) => value === this.metadata.type,
        validationError: `Type can only be '${this.metadata.type}'!`
      }),
      name: new StringField({required: true}),
      description: new HTMLField({required: true}),
      cost: new SchemaField({
        value: new NumberField({min: 0, integer: true, nullable: false, initial: 1})
      })
    };
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The id of this activity.
   * @type {string}
   */
  get id() {
    return this._id;
  }

  /* -------------------------------------------------- */

  /**
   * The uuid of this activity.
   * @type {string}
   */
  get uuid() {
    return `${this.item.uuid}.Activity.${this.id}`;
  }

  /* -------------------------------------------------- */

  get sheet() {
    if (!BaseActivity.#sheets.has(this.uuid)) {
      const cls = new ActivitySheet({document: this});
      BaseActivity.#sheets.set(this.uuid, cls);
    }
    return BaseActivity.#sheets.get(this.uuid);
  }

  /* -------------------------------------------------- */

  /**
   * The item on which this activity is embedded.
   * @type {ItemArtichron}
   */
  get item() {
    return this.parent.parent;
  }

  /* -------------------------------------------------- */

  /**
   * Does this activity place a measured template?
   * @type {boolean}
   */
  get hasTemplate() {
    return this.target?.type && (this.target.type !== "single");
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  async update(data = {}) {
    const path = `system.activities.${this.id}`;
    if (!(this.id in this.item._source.system.activities)) return null;
    return this.item.update({[path]: data});
  }

  /* -------------------------------------------------- */

  async delete() {
    if (!(this.id in this.item._source.system.activities)) return null;
    const path = `system.activities.-=${this.id}`;
    await this.sheet?.close();
    return this.item.update({[path]: null});
  }

  /* -------------------------------------------------- */

  static async create(item, data) {
    const id = foundry.utils.randomID();
    const path = `system.activities.${id}`;
    return item.update({[path]: {...data, _id: id}});
  }

  /* -------------------------------------------------- */

  /**
   * Use this activity.
   * @returns {Promise}
   */
  async use() {
    const messageData = {
      type: "usage",
      speaker: ChatMessage.implementation.getSpeaker({actor: this.item.actor}),
      "system.activity": this.id,
      "system.item": this.item.uuid
    };

    return ChatMessage.implementation.create(messageData);
  }

  /* -------------------------------------------------- */

  /**
   * Consume the AP cost of this activity.
   * @returns {Promise<ActorArtichron|null>}
   */
  async consumeCost() {
    if (!this.cost.value) return null;

    const actor = this.item.actor;

    if (!actor.inCombat) {
      ui.notifications.warn(game.i18n.format("ARTICHRON.ACTIVITY.Warning.ConsumeOutOfCombat", {
        name: actor.name
      }));
      return null;
    }

    if (!actor.canPerformActionPoints(this.cost.value)) {
      ui.notifications.warn(game.i18n.format("ARTICHRON.ACTIVITY.Warning.ConsumeCostUnavailable", {
        name: actor.name, number: this.cost.value
      }));
      return null;
    }

    const result = await this.item.actor.spendActionPoints(this.cost.value);
    if (result) {
      ui.notifications.info(game.i18n.format("ARTICHRON.ACTIVITY.Warning.ConsumedCost", {
        name: actor.name, number: this.cost.value
      }));
    }
    return result;
  }

  /* -------------------------------------------------- */

  /**
   * Place measured templates.
   * @returns {Promise<MeasuredTemplateArtichron[]>}
   */
  async placeTemplate() {
    if (!this.hasTemplate) {
      throw new Error("This item cannot create measured templates!");
    }

    const initialLayer = canvas.activeLayer;
    const templateDatas = [];
    const token = this.item.token;

    const target = {...this.target};
    if (target.type === "radius") target.count = 1;
    target.attach = CONFIG.SYSTEM.TARGET_TYPES[target.type].attached ?? false;

    for (let i = 0; i < target.count; i++) {
      const templateData = await CONFIG.MeasuredTemplate.objectClass.fromToken(token, target, {
        lock: true,
        templateData: templateDatas.at(-1)
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
          "flags.artichron.combat.end": this.target.duration
        });
      }
    }

    const templates = await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", templateDatas);
    initialLayer.activate();
    return templates;
  }

  /* -------------------------------------------------- */

  /**
   * Data for buttons that will be created in the chat message when using this activity.
   * @type {object[]}
   */
  get chatButtons() {
    return [
      this.cost.value ? {action: "cost", label: `Consume ${this.cost.value} AP`} : null,
      this.hasTemplate ? {action: "template", label: "Template"} : null
    ].filter(u => u);
  }
}

class DamageActivity extends BaseActivity {
  /** @inheritdoc */
  static metadata = Object.freeze({
    type: "damage",
    label: "ARTICHRON.ACTIVITY.Types.Damage"
  });

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      damage: new ArrayField(new SchemaField({
        formula: new StringField({required: true}),
        type: new StringField({
          required: true,
          choices: CONFIG.SYSTEM.DAMAGE_TYPES,
          initial: "physical"
        })
      })),
      target: targetField()
    });
  }

  /* -------------------------------------------------- */

  async rollDamage({ammo, multiply, addition} = {}, {create = true} = {}) {
    if (!this.hasDamage) {
      ui.notifications.warn("ARTICHRON.Warning.ItemHasNoDamageRolls", {localize: true});
      return null;
    }

    const rollData = this.item.getRollData();
    if (ammo) rollData.ammo = ammo.getRollData().item;

    const parts = foundry.utils.deepClone(this._damages);

    const mods = ammo ? ammo.system.ammoProperties : new Set();
    if (mods.has("damageOverride")) {
      const override = ammo.system.damage.override;
      for (const p of parts) {
        if ((override.group === "all") || (CONFIG.SYSTEM.DAMAGE_TYPES[p.type].group === override.group)) {
          p.type = override.value;
        }
      }
    }

    if (mods.has("damageParts")) {
      parts.push(...ammo.system._damages);
    }

    const rolls = Object.entries(parts.reduce((acc, d) => {
      acc[d.type] ??= [];
      acc[d.type].push(d.formula);
      return acc;
    }, {})).map(([type, formulas]) => {
      const roll = new CONFIG.Dice.DamageRoll(formulas.join("+"), rollData, {type: type});
      roll.alter(multiply ?? 1, addition ?? 0);
      return roll;
    });

    for (const roll of rolls) await roll.evaluate();

    // Add any amplifying bonuses (increasing the amount of damage dealt of a given type).
    for (const roll of rolls) {
      const group = CONFIG.SYSTEM.DAMAGE_TYPES[roll.type].group;
      const bonus = this.item.actor.system.bonuses.damage[group];
      if (!bonus) continue;
      const terms = [
        new foundry.dice.terms.OperatorTerm({operator: "+"}),
        new foundry.dice.terms.NumericTerm({number: Math.ceil(roll.total * bonus / 100)})
      ];
      for (const term of terms) {
        term._evaluated = true;
        roll.terms.push(term);
      }
      roll.resetFormula();
      roll._total = roll._evaluateTotal();
    }

    if (create) {
      const rollMode = game.settings.get("core", "rollMode");
      const messageData = {
        type: "damage",
        rolls: rolls,
        speaker: ChatMessage.implementation.getSpeaker({actor: this.item.actor}),
        flavor: game.i18n.format("ARTICHRON.ChatMessage.DamageRoll", {name: this.item.name}),
        "system.activity": this.id,
        "system.item": this.item.uuid,
        "system.targets": Array.from(game.user.targets.map(t => t.actor?.uuid))
      };
      ChatMessage.implementation.applyRollMode(messageData, rollMode);
      return ChatMessage.implementation.create(messageData);
    } else {
      return rolls;
    }
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * Does this item have any valid damage formulas?
   * @type {boolean}
   */
  get hasDamage() {
    return this.damage.some(({formula, type}) => {
      return formula && (type in CONFIG.SYSTEM.DAMAGE_TYPES) && Roll.validate(formula);
    });
  }

  /* -------------------------------------------------- */

  /**
   * Valid damage parts.
   * @type {object[]}
   */
  get _damages() {
    return this.damage.filter(({formula, type}) => {
      return formula && (type in CONFIG.SYSTEM.DAMAGE_TYPES) && Roll.validate(formula);
    });
  }

  /* -------------------------------------------------- */

  get chatButtons() {
    const buttons = super.chatButtons;
    if (this.hasDamage) buttons.unshift({action: "damage", label: "Damage"});
    return buttons;
  }
}

class HealingActivity extends BaseActivity {
  /** @inheritdoc */
  static metadata = Object.freeze({
    type: "healing",
    label: "ARTICHRON.ACTIVITY.Types.Healing"
  });

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      healing: new SchemaField({
        formula: new StringField({required: true})
      }),
      target: targetField()
    });
  }

  /* -------------------------------------------------- */

  async rollHealing({multiply, addition} = {}, {create = true} = {}) {
    if (!this.healing.formula || !foundry.dice.Roll.validate(this.healing.formula)) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.WARNING.MissingHealingFormula", {localize: true});
      return null;
    }

    const rollData = this.item.getRollData();
    const roll = foundry.dice.Roll.create(this.healing.formula, rollData);
    roll.alter(multiply ?? 1, addition ?? 0);
    await roll.evaluate();

    if (create) {
      const rollMode = game.settings.get("core", "rollMode");
      const messageData = {
        type: "healing",
        rolls: [roll],
        speaker: ChatMessage.implementation.getSpeaker({actor: this.item.actor}),
        flavor: game.i18n.format("ARTICHRON.ChatMessage.HealingRoll", {name: this.item.name}),
        "system.activity": this.id,
        "system.item": this.item.uuid,
        "system.targets": Array.from(game.user.targets.map(t => t.actor?.uuid))
      };
      ChatMessage.implementation.applyRollMode(messageData, rollMode);
      return ChatMessage.implementation.create(messageData);
    } else {
      return [roll];
    }
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  get chatButtons() {
    const buttons = super.chatButtons;
    buttons.unshift({action: "healing", label: "Healing"});
    return buttons;
  }
}

class TeleportActivity extends BaseActivity {
  /** @inheritdoc */
  static metadata = Object.freeze({
    type: "teleport",
    label: "ARTICHRON.ACTIVITY.Types.Teleport"
  });

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      teleport: new SchemaField({
        count: new NumberField({min: 1, integer: true, nullable: false, initial: 1}),
        distance: new NumberField({min: 1, integer: true, nullable: false, initial: 1}),
        self: new BooleanField({initial: true})
      })
    });
  }

  /* -------------------------------------------------- */

  /**
   * Teleport a token targeted by this activity.
   * @returns {Promise<TokenDocumentArtichron>}     A promise that resolves to the updated token document.
   */
  async teleportToken() {
    const token = this.item.token.document;
    if (!token) throw new Error("A token must be present on the scene!");
    const config = {tokens: [token]};
    const place = await artichron.helpers.TokenPlacement.place(config);
    if (!place.length) return;
    const {x, y, rotation} = place[0];
    return token.update({x, y, rotation}, {animate: false, teleport: true, forced: true});
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  get chatButtons() {
    const buttons = super.chatButtons;
    buttons.unshift({action: "teleport", label: "Teleport"});
    return buttons;
  }
}

class EffectActivity extends BaseActivity {
  /** @inheritdoc */
  static metadata = Object.freeze({
    type: "effect",
    label: "ARTICHRON.ACTIVITY.Types.Effect"
  });

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      effects: new SchemaField({
        ids: new SetField(new StringField())
      }),
      target: targetField()
    });
  }

  /* -------------------------------------------------- */

  async grantEffects(targets = []) {
    const effects = this.effects.ids.map(id => this.item.effects.get(id));
    for (const actor of targets) {
      for (const effect of effects) {
        if (effect) artichron.utils.sockets.grantBuff(effect, actor);
      }
    }
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  get chatButtons() {
    const buttons = super.chatButtons;
    buttons.unshift({action: "effect", label: "Grant Buff"});
    return buttons;
  }
}

class DefendActivity extends BaseActivity {
  /** @inheritdoc */
  static metadata = Object.freeze({
    type: "defend",
    label: "ARTICHRON.ACTIVITY.Types.Defend",
    types: new Set(["weapon", "shield", "spell"])
  });

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      defend: new SchemaField({
        formula: new StringField({required: true})
      })
    });
  }

  /* -------------------------------------------------- */

  /**
   * Perform a defensive roll.
   * @returns {Promise<ChatMessageArtichron>}
   */
  async rollDefense() {
    if (!this.defend.formula) {
      throw new Error("DefendActivity must have a formula defined.");
    }

    const attr = this.item.system.attributes.value;
    if (!attr.has("blocking") && !attr.has("parrying")) {
      throw new Error("This item cannot be used to defend.");
    }

    const roll = Roll.create(this.defend.formula, this.item.getRollData());
    if (!attr.has("blocking")) roll.alter(0.5);

    if (this.item.actor.canPerformActionPoints(this.cost.value)) {
      await this.item.actor.spendActionPoints(this.cost.value);
    }

    return roll.toMessage({
      flavor: game.i18n.format("ARTICHRON.ROLL.Defend.Flavor", {name: this.item.name}),
      speaker: ChatMessage.implementation.getSpeaker({actor: this.item.actor})
    });
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */
}
