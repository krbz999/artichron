import ActivitySheet from "../../applications/activity-sheet.mjs";
import ActivityUseDialog from "../../applications/item/activity-use-dialog.mjs";
import RollConfigurationDialog from "../../applications/item/roll-configuration-dialog.mjs";

/**
 * @typedef {object} ActivityMetadata     Activity metadata.
 * @property {string} type                The activity type.
 * @property {string} label               Name of this activity type.
 */

const {ArrayField, HTMLField, NumberField, SchemaField, SetField, StringField} = foundry.data.fields;

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
    return CONFIG.SYSTEM.TARGET_TYPES[this.target?.type]?.isArea ?? false;
  }

  /* -------------------------------------------------- */

  /**
   * The type of pool used to enhance the activity.
   * @type {string}
   */
  get poolType() {
    return (this.item.type === "spell") ? "mana" : "stamina";
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Update this activity.
   * @param {object} data                       Update data.
   * @returns {Promise<ItemArtichron|null>}     A promise that resolves to the updated item.
   */
  async update(data = {}) {
    const path = `system.activities.${this.id}`;
    if (!(this.id in this.item._source.system.activities)) return null;
    return this.item.update({[path]: data});
  }

  /* -------------------------------------------------- */

  /**
   * Delete this activity.
   * @returns {Promise<ItemArtichron|null>}     A promise that resolves to the updated item.
   */
  async delete() {
    if (!(this.id in this.item._source.system.activities)) return null;
    const path = `system.activities.-=${this.id}`;
    await this.sheet?.close();
    return this.item.update({[path]: null});
  }

  /* -------------------------------------------------- */

  /**
   * Create a new activity.
   * @param {ItemArtichron} item                The item to create the activity on.
   * @param {object} data                       Creation data.
   * @returns {Promise<ItemArtichron|null>}     A promise that resolves to the updated item.
   */
  static async create(item, data) {
    const id = foundry.utils.randomID();
    const path = `system.activities.${id}`;
    const result = await item.update({[path]: {...data, _id: id}});
    item.system.activities.get(id).sheet.render({force: true});
    return result;
  }

  /* -------------------------------------------------- */

  /**
   * Use this activity.
   * @returns {Promise}
   */
  async use() {
    const configuration = await ActivityUseDialog.create(this);
    if (!configuration) return null;

    const {elixirs, ...inputs} = configuration;
    const actor = this.item.actor;
    const item = this.item;

    const messageData = {
      type: "usage",
      speaker: ChatMessage.implementation.getSpeaker({actor: actor}),
      "system.activity": this.id,
      "system.item": item.uuid
    };

    for (const [k, v] of Object.entries(inputs)) {
      if (v) foundry.utils.setProperty(messageData, `flags.artichron.usage.${k}.increase`, v);
    }

    // Construct and perform updates.
    let total = Object.values(inputs).reduce((acc, v) => acc + (v ?? 0), 0);
    const itemUpdates = [];
    for (const id of elixirs ?? []) {
      const elixir = actor.items.get(id);
      if (!elixir || !total) continue;
      itemUpdates.push(elixir.system._usageUpdate());
      total = total - 1;
    }

    // Perform updates.
    let path;
    if (actor.type === "monster") path = "system.danger.pool.spent";
    else path = `system.pools.${this.poolType}.spent`;
    const value = foundry.utils.getProperty(actor, path);
    const actorUpdate = total ? {[path]: value + total} : {};

    await Promise.all([
      foundry.utils.isEmpty(actorUpdate) ? null : actor.update(actorUpdate),
      foundry.utils.isEmpty(itemUpdates) ? null : actor.updateEmbeddedDocuments("Item", itemUpdates)
    ]);

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
   * @param {object} [config]               Configuration object.
   * @param {number} [config.increase]      The increase in size of the template.
   * @returns {Promise<MeasuredTemplate[]>}
   */
  async placeTemplate({increase = 0} = {}) {
    if (!this.hasTemplate) {
      ui.notifications.error("ARTICHRON.ACTIVITY.Warning.NoTemplates", {localize: true});
      return;
    }

    const initialLayer = canvas.activeLayer;
    const templateDatas = [];
    const token = this.item.token;

    const target = {...this.target};
    if (target.type === "radius") target.count = 1;
    if (increase) target.size = target.size + increase;
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
      this.cost.value ? {
        action: "cost",
        label: game.i18n.format("ARTICHRON.ACTIVITY.Buttons.Consume", {number: this.cost.value})
      } : null,
      this.hasTemplate ? {
        action: "template",
        label: game.i18n.localize("ARTICHRON.ACTIVITY.Buttons.Template")
      } : null
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
      ammunition: new SchemaField({
        type: new StringField({
          required: false,
          blank: true,
          choices: CONFIG.SYSTEM.AMMUNITION_TYPES
        })
      }),
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

  /**
   * Stored references of what ammunition is default set for damage rolls.
   * @type {Map<string, string>}
   */
  static ammunitionRegistry = new Map();

  /* -------------------------------------------------- */

  /**
   * Perform a damage roll.
   * @param {object} [config]                 Damage roll config.
   * @param {ItemArtichron} [config.ammo]     An ammo item for additional properties.
   * @param {number} [config.multiply]        A multiplier on the number of dice rolled.
   * @param {number} [config.increase]        An addition to the number of dice rolled.
   * @param {object} [options]                Chat message options.
   * @param {boolean} [options.create]        If false, returns the rolls instead of a chat message.
   * @returns {Promise<ChatMessageArtichron|RollArtichron[]|null>}
   */
  async rollDamage({ammo, multiply, increase} = {}, {create = true} = {}) {
    if (!this.hasDamage) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoDamage", {localize: true});
      return null;
    }

    if (!ammo) ammo = this.item.actor.items.get(DamageActivity.ammunitionRegistry.get(this.uuid));

    // Prepare roll configuration dialog.
    const fieldsets = !this.usesAmmo ? [] : [{
      legend: "ARTICHRON.ROLL.Damage.Ammunition",
      fields: [{
        field: new foundry.data.fields.StringField({
          required: false,
          blank: true,
          label: "ARTICHRON.ROLL.Damage.AmmoItem",
          hint: "ARTICHRON.ROLL.Damage.AmmoItemHint",
          choices: this.item.actor.items.reduce((acc, item) => {
            if (item.type !== "ammo") return acc;
            if (item.system.category.subtype === this.ammunition.type) {
              acc[item.id] = item.name;
            }
            return acc;
          }, {})
        }),
        options: {name: "ammo", value: ammo?.id}
      }]
    }];

    const configuration = await RollConfigurationDialog.create({
      fieldsets: fieldsets,
      document: this,
      window: {title: game.i18n.format("ARTICHRON.ROLL.Damage.Title", {name: this.item.name})}
    });
    if (!configuration) return null;
    if (configuration.ammo) ammo = this.item.actor.items.get(configuration.ammo);

    const rollData = this.item.getRollData();
    if (ammo) rollData.ammo = ammo.getRollData().item;

    const parts = foundry.utils.deepClone(this._damages);
    const mods = ammo ? ammo.system.ammoProperties : new Set();

    // Override the damage type.
    if (mods.has("override")) {
      const override = ammo.system.override;
      for (const p of parts) {
        if ((override.group === "all") || (CONFIG.SYSTEM.DAMAGE_TYPES[p.type].group === override.group)) {
          p.type = override.value;
        }
      }
    }

    const rolls = Object.entries(parts.reduce((acc, d) => {
      acc[d.type] ??= [];
      acc[d.type].push(d.formula);
      return acc;
    }, {})).map(([type, formulas]) => {
      const roll = new CONFIG.Dice.DamageRoll(formulas.join("+"), rollData, {type: type});
      roll.alter(multiply ?? 1, increase ?? 0);
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

    // TODO: consume ammo

    if (create) {
      const rollMode = configuration.rollmode ?? game.settings.get("core", "rollMode");
      const messageData = {
        type: "damage",
        rolls: rolls,
        speaker: ChatMessage.implementation.getSpeaker({actor: this.item.actor}),
        flavor: game.i18n.format("ARTICHRON.ROLL.Damage.Flavor", {name: this.item.name}),
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

  /**
   * Does this activity make use of ammo?
   * @type {boolean}
   */
  get usesAmmo() {
    return !!this.ammunition.type;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get chatButtons() {
    const buttons = super.chatButtons;
    if (this.hasDamage) buttons.unshift({
      action: "damage",
      label: game.i18n.localize("ARTICHRON.ACTIVITY.Buttons.Damage")
    });
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

  /**
   * Perform a healing roll.
   * @param {object} [config]               Roll config.
   * @param {number} [config.multiply]      A multiplier on the number of dice rolled.
   * @param {number} [config.addition]      An addition to the number of dice rolled.
   * @param {object} [options]              Chat message options.
   * @param {boolean} [options.create]      If false, returns the rolls instead of a chat message.
   * @returns {Promise<ChatMessageArtichron|RollArtichron[]|null>}
   */
  async rollHealing({multiply, addition} = {}, {create = true} = {}) {
    if (!this.healing.formula || !foundry.dice.Roll.validate(this.healing.formula)) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.WARNING.NoHealing", {localize: true});
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
        flavor: game.i18n.format("ARTICHRON.ROLL.Healing.Flavor", {name: this.item.name}),
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

  /** @inheritdoc */
  get chatButtons() {
    const buttons = super.chatButtons;
    buttons.unshift({
      action: "healing",
      label: game.i18n.localize("ARTICHRON.ACTIVITY.Buttons.Healing")
    });
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
        distance: new NumberField({min: 1, integer: true, nullable: false, initial: 1})
      })
    });
  }

  /* -------------------------------------------------- */

  /**
   * Teleport a token targeted by this activity.
   * @param {object} [config]                       Configuration object.
   * @param {number} [config.increase]              The increase in distance of the teleport.
   * @returns {Promise<TokenDocumentArtichron>}     A promise that resolves to the updated token document.
   */
  async teleportToken({increase = 0} = {}) {
    const token = this.item.token;
    if (!token) {
      ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoToken", {localize: true});
      return;
    }

    const drawCircle = () => {
      const range = this.teleport.distance + increase
      + (canvas.grid.distance * Math.max(token.document.width, token.document.height, 1) / 2);
      const points = canvas.grid.getCircle({x: 0, y: 0}, range).reduce((acc, p) => {
        return acc.concat([p.x, p.y]);
      }, []);
      const circle = new PIXI.Graphics();
      circle.lineStyle({width: 4, color: 0x000000, alpha: 1});
      circle.drawShape(new PIXI.Polygon(points));
      circle.pivot.set(token.document.x - token.center.x, token.document.y - token.center.y);
      token.addChild(circle);
      return circle;
    };

    const circle = drawCircle();
    const config = {tokens: [token.document]};
    const place = await artichron.canvas.TokenPlacement.place(config);
    token.removeChild(circle);
    if (!place.length) return;
    const {x, y, rotation} = place[0];
    return token.document.update({x, y, rotation}, {animate: false, teleport: true, forced: true});
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  get chatButtons() {
    const buttons = super.chatButtons;
    buttons.unshift({
      action: "teleport",
      label: game.i18n.localize("ARTICHRON.ACTIVITY.Buttons.Teleport")
    });
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

  /**
   * Transfer a copy of the effects to actors.
   * @param {ActorArtichron[]} [targets]      The actor targets.
   * @returns {Promise<void>}                 A promise that resolves once all socket events have been emitted.
   */
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

  /** @inheritdoc */
  get chatButtons() {
    const buttons = super.chatButtons;
    buttons.unshift({
      action: "effect",
      label: game.i18n.localize("ARTICHRON.ACTIVITY.Buttons.Effect")
    });
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
      ui.notifications.error("ARTICHRON.ACTIVITY.Warning.NoDefense", {localize: true});
      return;
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
