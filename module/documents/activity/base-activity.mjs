import ActivitySheet from "../../applications/activity-sheet.mjs";
import ActivityUseDialog from "../../applications/item/activity-use-dialog.mjs";
import ChatMessageArtichron from "../chat-message.mjs";

/**
 * @typedef {object} ActivityMetadata     Activity metadata.
 * @property {string} type                The activity type.
 * @property {string} label               Name of this activity type.
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

    console.warn(configuration);
    return; // TODO: propagate the choices made to the "main" method of each activity type.

    const {elixirs, ...inputs} = configuration;
    const actor = this.item.actor;
    const item = this.item;

    const messageData = {
      type: "usage",
      speaker: ChatMessageArtichron.getSpeaker({actor: actor}),
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

    return ChatMessageArtichron.create(messageData);
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
