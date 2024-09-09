import ActivitySheet from "../../applications/activity-sheet.mjs";

/**
 * @typedef {object} ActivityMetadata     Activity metadata.
 * @property {string} type                The activity type.
 * @property {string} label               Name of this activity type.
 */

/**
 * @typedef {object} ActivityConsumptionConfiguration     Activity consumption configuration.
 *
 * NOTE: Elixir consumption takes priority over pool consumption, meaning the `pool` property
 * should be equal to the full amount of points allocated; elixirs will subtract from this
 * amount as they are consumed. E.g., if enhancing an activity by 5 points but consuming 2
 * elixirs, then set `pool: 5`, the elixirs will be consumed, and only 3 points will be
 * subtracted.
 *
 * @property {boolean} [actionPoints]     Whether to consume action points.
 * @property {string} [ammunition]        The id of an ammunition item to reduce in quantity.
 * @property {string[]} [elixirs]         The ids of elixirs to reduce in usage.
 * @property {number} [pool]              The amount to subtract from a relevant pool.
 */

const {HTMLField, NumberField, SchemaField, StringField} = foundry.data.fields;

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

  /**
   * Reference to the sheet for this activity, registered in a static map.
   * @type {ActivitySheet}
   */
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
    throw new Error("The 'Activity#use' method must be subclassed.");
  }

  /* -------------------------------------------------- */

  /**
   * Consume the various properties when using this activity.
   * @param {ActivityConsumptionConfiguration} config     Consumption configuration.
   * @returns {Promise<boolean>}                          Whether the consumption was successful.
   */
  async consume(config = {}) {
    const actor = this.item.actor;
    const item = this.item;

    config = foundry.utils.mergeObject({
      actionPoints: actor.inCombat,
      ammunition: null,
      elixirs: [],
      pool: null
    }, config);

    const actorUpdate = {};
    const itemUpdates = [];

    // Consume action points.
    if (config.actionPoints) {
      const value = this.cost.value;
      if (!actor.inCombat) {
        ui.notifications.warn(game.i18n.format("ARTICHRON.ACTIVITY.Warning.ConsumeOutOfCombat", {
          name: actor.name
        }));
        return false;
      }

      if (!actor.canPerformActionPoints(value)) {
        ui.notifications.warn(game.i18n.format("ARTICHRON.ACTIVITY.Warning.ConsumeCostUnavailable", {
          name: actor.name, number: value
        }));
        return false;
      }

      actorUpdate["system.pips.value"] = actor.system.pips.value - value;
    }

    // Reduce quantity of ammo by 1.
    if (config.ammunition) {
      const ammo = actor.items.get(config.ammunition);
      const qty = ammo.system.quantity.value;
      if (!qty) {
        ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoAmmo", {localize: true});
        return false;
      }
      itemUpdates.push({_id: ammo.id, "system.quantity.value": qty - 1});
    }

    // Consume elixirs.
    if (config.elixirs.length) {
      for (const id of config.elixirs) {
        const elixir = actor.items.get(id);
        if (!elixir) {
          ui.notifications.warn(game.i18n.format("ARTICHRON.ACTIVITY.Warning.NoElixir", {id: id}));
          return false;
        }

        if (!elixir.hasUses) {
          ui.notifications.warn(game.i18n.format("ARTICHRON.ACTIVITY.Warning.NoElixirUses", {name: elixir.name}));
          return false;
        }

        // Elixirs take precedence over pool points and substract from what is consumed there.
        if (config.pool > 0) {
          itemUpdates.push(elixir.system._usageUpdate());
          config.pool = config.pool - 1;
        }
      }
    }

    // Consume pools.
    if (config.pool > 0) {
      const isMonster = actor.type === "monster";
      const path = `${isMonster ? "danger.pool" : `pools.${this.poolType}`}.value`;
      const value = foundry.utils.getProperty(actor.system, path);
      if (value < config.pool) {
        ui.notifications.warn(game.i18n.format("ARTICHRON.ACTIVITY.Warning.NoPool", {
          pool: game.i18n.localize(`ARTICHRON.Pools.${isMonster ? "Danger" : this.poolType.capitalize()}`)
        }));
        return false;
      }

      actorUpdate[`system.${path}`] = value - config.pool;
    }

    return Promise.all([
      foundry.utils.isEmpty(actorUpdate) ? null : actor.update(actorUpdate),
      foundry.utils.isEmpty(itemUpdates) ? null : actor.updateEmbeddedDocuments("Item", itemUpdates)
    ]);
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
      const templateData = await artichron.canvas.TemplatePlacement.fromToken(token, target, {
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
