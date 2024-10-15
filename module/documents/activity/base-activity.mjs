import ActivitySheet from "../../applications/activity-sheet.mjs";
import ActivityUseDialog from "../../applications/item/activity-use-dialog.mjs";
import ChatMessageArtichron from "../chat-message.mjs";

/**
 * @typedef {object} ActivityMetadata     Activity metadata.
 * @property {string} type                The activity type.
 * @property {string} label               Name of this activity type.
 * @property {string} icon                Default icon of this activity type.
 */

const {BooleanField, FilePathField, HTMLField, NumberField, SchemaField, StringField} = foundry.data.fields;

export default class BaseActivity extends foundry.abstract.DataModel {
  /**
   * Activity metadata.
   * @type {ActivityMetadata}
   */
  static metadata = Object.freeze({
    type: "",
    label: "",
    icon: "systems/artichron/assets/icons/activity.svg"
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
      img: new FilePathField({
        categories: ["IMAGE"],
        initial: () => this.metadata.icon
      }),
      description: new HTMLField({required: true}),
      cost: new SchemaField({
        value: new NumberField({min: 0, integer: true, nullable: false, initial: 1}),
        uses: new BooleanField({initial: true})
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
   * Can this activity be boosted by an elixir or by expending from a pool?
   * @type {boolean}
   */
  get canBoost() {
    return ["armor", "shield", "spell", "weapon"].includes(this.item.type);
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

  /**
   * Does this activity make use of ammo?
   * @type {boolean}
   */
  get usesAmmo() {
    return (this.type === "damage") && this.item.usesAmmo;
  }

  /* -------------------------------------------------- */

  /**
   * Does this item have any valid damage formulas?
   * @type {boolean}
   */
  get hasDamage() {
    return false;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare the base usage configs.
   * @param {object} [usageConfig]        Values to override in the usage config.
   * @param {object} [dialogConfig]       Values to override in the dialog config.
   * @param {object} [messageConfig]      Values to override in the message config.
   * @returns {{usage: object, dialog: object, message: object}}
   */
  getUsageConfigs(usageConfig = {}, dialogConfig = {}, messageConfig = {}) {
    const item = this.item;
    const actor = item.actor;
    const isSpell = item.type === "spell";
    const elixirs = actor.items.reduce((acc, item) => {
      if (item.type !== "elixir") return acc;
      if (item.system.hasUses && item.system.isBooster && (item.system.boost === this.poolType)) {
        acc[item.id] = item.name;
      }
      return acc;
    }, {});

    const message = {};

    const pips = this.item.actor.inCombat && (this.cost.value > 0);
    const uses = this.item.type === "elixir";

    const dialog = {
      consume: {
        show: pips || uses,
        showAction: pips,
        action: true,
        showUses: uses,
        uses: this.cost.uses
      },
      damage: {
        show: this.hasDamage && this.canBoost,
        ammo: this.usesAmmo,
        ammoId: item.getFlag("artichron", `usage.${this.id}.damage.ammoId`)
      },
      defend: {
        show: (this.type === "defend") && this.canBoost
      },
      healing: {
        show: (this.type === "healing") && this.canBoost
      },
      template: {
        show: this.hasTemplate,
        canIncrease: isSpell,
        place: item.getFlag("artichron", `usage.${this.id}.template.place`) ?? true
      },
      teleport: {
        show: (this.type === "teleport") && this.canBoost
      },
      elixirs: {
        show: this.canBoost && !foundry.utils.isEmpty(elixirs),
        choices: elixirs
      },
      rollMode: {
        show: ["damage", "defend", "healing"].includes(this.type),
        mode: item.getFlag("artichron", `usage.${this.id}.rollMode.mode`) ?? game.settings.get("core", "rollMode")
      }
    };

    const usage = {
      consume: {
        action: dialog.consume.showAction && dialog.consume.action,
        uses: dialog.consume.showUses && dialog.consume.uses
      },
      damage: {
        increase: 0,
        ammoId: dialog.damage.ammo ? dialog.damage.ammoId : null
      },
      defend: {
        increase: 0
      },
      healing: {
        increase: 0
      },
      template: {
        increase: 0,
        place: dialog.template.show && dialog.template.place
      },
      teleport: {
        increase: 0
      },
      elixirs: {
        ids: []
      },
      rollMode: {
        mode: dialog.rollMode.mode
      }
    };

    // Configuration required?
    dialog.configure = Object.values(dialog).some(u => u.show);

    foundry.utils.mergeObject(usage, usageConfig);
    foundry.utils.mergeObject(dialog, dialogConfig);
    foundry.utils.mergeObject(message, messageConfig);

    return {usage, dialog, message};
  }

  /* -------------------------------------------------- */

  /**
   * Configure the usage of this activity.
   * @param {object} [usage]        Values to override in the usage config.
   * @param {object} [dialog]       Values to override in the dialog config.
   * @param {object} [message]      Values to override in the message config.
   * @returns {Promise<{usage: object, dialog: object, message: object}>}
   */
  async configure(usage = {}, dialog = {}, message = {}) {
    // Skip dialog if shift is held.
    if (dialog.event?.shiftKey) {
      dialog.configure = false;
    }

    // Prepare configurations.
    const configs = this.getUsageConfigs(usage, dialog, message);

    if (configs.dialog.configure) {
      const configuration = await ActivityUseDialog.create({activity: this, ...configs});
      if (!configuration) return null;
      foundry.utils.mergeObject(configs.usage, configuration);
    }

    return configs;
  }

  /* -------------------------------------------------- */

  /**
   * Get the pool cost of a given configuration.
   * @param {object} [usage]      Usage configuration.
   * @returns {number}            The total cost.
   */
  getUsagePoolCost(usage = {}) {
    let count =
      (usage.damage?.increase ?? 0)
      + (usage.healing?.increase ?? 0)
      + (usage.template?.place ? usage.template?.increase ?? 0 : 0)
      + (usage.teleport?.increase ?? 0);

    for (const elixir of usage.elixirs?.ids ?? []) {
      const item = this.item.actor.items.get(elixir);
      if (!item) continue;
      count = count - 1;
    }

    return count;
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
   * @param {object} [usage]        Usage configuration.
   * @param {object} [dialog]       Dialog configuration.
   * @param {object} [message]      Message configuration.
   * @returns {Promise<ChatMessageArtichron|null>}
   */
  async use(usage = {}, dialog = {}, message = {}) {
    // Must be subclassed.
  }

  /* -------------------------------------------------- */

  /**
   * Consume the various properties when using this activity.
   * @param {object} [usage]          Usage configuration.
   * @returns {Promise<boolean>}      Whether the consumption was successful.
   */
  async consume(usage = {}) {
    const actor = this.item.actor;
    const item = this.item;

    const actorUpdate = {};
    const itemUpdates = [];

    // Consume action points.
    if (usage.consume?.action) {
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

    // Consume usage if this activity is on an elixir.
    if (usage.consume?.uses) {
      if (!this.item.hasUses) {
        ui.notifications.warn(game.i18n.format("ARTICHRON.ACTIVITY.Warning.NoElixirUses", {name: this.item.name}));
        return false;
      }
      itemUpdates.push(this.item.system._usageUpdate());
    }

    // Reduce quantity of ammo by 1.
    if (usage.damage?.ammoId) {
      const ammo = actor.items.get(usage.damage.ammoId);
      const qty = ammo.system.quantity.value;
      if (!qty) {
        ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoAmmo", {localize: true});
        return false;
      }
      itemUpdates.push({_id: ammo.id, "system.quantity.value": qty - 1});
    }

    // Consume elixirs.
    if (usage.elixirs?.ids.length) {
      for (const id of usage.elixirs.ids) {
        const elixir = actor.items.get(id);
        if (!elixir) {
          ui.notifications.warn(game.i18n.format("ARTICHRON.ACTIVITY.Warning.NoElixir", {id: id}));
          return false;
        }

        if (!elixir.hasUses) {
          ui.notifications.warn(game.i18n.format("ARTICHRON.ACTIVITY.Warning.NoElixirUses", {name: elixir.name}));
          return false;
        }

        // Validation such that elixirs are not consumed needlessly is performed elsewhere.
        itemUpdates.push(elixir.system._usageUpdate());
      }
    }

    const pool = this.getUsagePoolCost(usage);

    // Consume pools.
    if (pool > 0) {
      const isMonster = actor.type === "monster";
      const path = isMonster ? "danger.pool" : `pools.${this.poolType}`;
      const value = foundry.utils.getProperty(actor.system, `${path}.value`);
      if (value < pool) {
        ui.notifications.warn(game.i18n.format("ARTICHRON.ACTIVITY.Warning.NoPool", {
          pool: game.i18n.localize(`ARTICHRON.Pools.${isMonster ? "Danger" : this.poolType.capitalize()}`)
        }));
        return false;
      }

      actorUpdate[`system.${path}.spent`] = foundry.utils.getProperty(actor.system, `${path}.spent`) + pool;
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
    target.attach = CONFIG.SYSTEM.TARGET_TYPES[target.type].isAttached;

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
}
