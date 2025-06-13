import TypedPseudoDocument from "../typed-pseudo-document.mjs";

const {
  BooleanField, HTMLField, NumberField, SchemaField,
} = foundry.data.fields;

export default class BaseActivity extends TypedPseudoDocument {
  /** @type {import("../../../_types").ActivityMetadata} */
  static get metadata() {
    return {
      ...super.metadata,
      documentName: "Activity",
      defaultImage: "systems/artichron/assets/icons/activity.svg",
      sheetClass: artichron.applications.sheets.item.ActivitySheet,
      types: artichron.data.pseudoDocuments.activities,
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["ARTICHRON.ACTIVITY"];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      description: new HTMLField({ required: true }),
      cost: new SchemaField({
        value: new NumberField({ min: 0, integer: true, nullable: false, initial: 1 }),
        uses: new BooleanField({ initial: true }),
      }),
    });
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The item on which this activity is embedded.
   * @type {ItemArtichron}
   */
  get item() {
    return this.document;
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
    return artichron.config.TARGET_TYPES[this.target?.type]?.isArea ?? false;
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
    return this.item.usesAmmo;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
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
        uses: this.cost.uses,
      },
      defend: {
        show: (this.type === "defend") && this.canBoost,
      },
      healing: {
        show: (this.type === "healing") && this.canBoost,
      },
      template: {
        show: this.hasTemplate,
        canIncrease: isSpell,
        place: item.getFlag("artichron", `usage.${this.id}.template.place`) ?? true,
      },
      teleport: {
        show: (this.type === "teleport") && this.canBoost,
      },
      elixirs: {
        show: this.canBoost && !foundry.utils.isEmpty(elixirs),
        choices: elixirs,
      },
      rollMode: {
        show: ["defend", "healing"].includes(this.type),
        mode: item.getFlag("artichron", `usage.${this.id}.rollMode.mode`) ?? game.settings.get("core", "rollMode"),
      },
    };

    const usage = {
      consume: {
        action: dialog.consume.showAction && dialog.consume.action,
        uses: dialog.consume.showUses && dialog.consume.uses,
      },
      defend: {
        increase: 0,
      },
      healing: {
        increase: 0,
      },
      template: {
        increase: 0,
        place: dialog.template.show && dialog.template.place,
      },
      teleport: {
        increase: 0,
      },
      elixirs: {
        ids: [],
      },
      rollMode: {
        mode: dialog.rollMode.mode,
      },
    };

    // Configuration required?
    dialog.configure = Object.values(dialog).some(u => u.show);

    foundry.utils.mergeObject(usage, usageConfig);
    foundry.utils.mergeObject(dialog, dialogConfig);
    foundry.utils.mergeObject(message, messageConfig);

    return { usage, dialog, message };
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
      const configuration = await artichron.applications.apps.item.ActivityUseDialog.create({ activity: this, ...configs });
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
      (usage.healing?.increase ?? 0)
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

  /**
   * Use this activity.
   * @param {object} [usage]      Usage configuration.
   * @param {object} [dialog]     Dialog configuration.
   * @param {object} [message]    Message configuration.
   * @returns {Promise<ChatMessageArtichron|null>}
   * @abstract
   */
  async use(usage = {}, dialog = {}, message = {}) {}

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
        ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.ConsumeOutOfCombat", {
          format: { name: actor.name },
        });
        return false;
      }

      if (!actor.canPerformActionPoints(value)) {
        ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.ConsumeCostUnavailable", {
          format: { name: actor.name, number: value },
        });
        return false;
      }

      actorUpdate["system.pips.value"] = actor.system.pips.value - value;
    }

    // Consume usage if this activity is on an elixir.
    if (usage.consume?.uses) {
      if (!this.item.hasUses) {
        ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoElixirUses", {
          format: { name: this.item.name },
        });
        return false;
      }
      itemUpdates.push(this.item.system._usageUpdate());
    }

    // Consume elixirs.
    if (usage.elixirs?.ids.length) {
      for (const id of usage.elixirs.ids) {
        const elixir = actor.items.get(id);
        if (!elixir) {
          ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoElixir", { format: { id: id } });
          return false;
        }

        if (!elixir.hasUses) {
          ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoElixirUses", { format: { name: elixir.name } });
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
        ui.notifications.warn("ARTICHRON.ACTIVITY.Warning.NoPool", {
          format: { pool: game.i18n.localize(`ARTICHRON.Pools.${isMonster ? "Danger" : this.poolType.capitalize()}`) },
        });
        return false;
      }

      actorUpdate[`system.${path}.spent`] = foundry.utils.getProperty(actor.system, `${path}.spent`) + pool;
    }

    return Promise.all([
      foundry.utils.isEmpty(actorUpdate) ? null : actor.update(actorUpdate),
      foundry.utils.isEmpty(itemUpdates) ? null : actor.updateEmbeddedDocuments("Item", itemUpdates),
    ]);
  }

  /* -------------------------------------------------- */

  /**
   * Place measured templates.
   * @param {object} [config]               Configuration object.
   * @param {number} [config.increase]      The increase in size of the template.
   * @returns {Promise<MeasuredTemplate[]>}
   */
  async placeTemplate({ increase = 0 } = {}) {
    if (!this.hasTemplate) {
      ui.notifications.error("ARTICHRON.ACTIVITY.Warning.NoTemplates", { localize: true });
      return;
    }

    const initialLayer = canvas.activeLayer;
    const templateDatas = [];
    const token = this.item.token;

    const target = { ...this.target };
    if (target.type === "radius") target.count = 1;
    if (increase) target.size = target.size + increase;
    target.attach = artichron.config.TARGET_TYPES[target.type].isAttached;

    for (let i = 0; i < target.count; i++) {
      const templateData = await artichron.canvas.placement.TemplatePlacement.fromToken(token, target, {
        lock: true,
        templateData: templateDatas.at(-1),
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
          "flags.artichron.combat.end": this.target.duration,
        });
      }
    }

    const templates = await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", templateDatas);
    initialLayer.activate();
    return templates;
  }

  /* -------------------------------------------------- */

  /**
   * Create a roll data object.
   * @returns {object}      Roll data.
   */
  getRollData() {
    const rollData = this.item.getRollData();
    rollData.activity = { ...this };
    return rollData;
  }
}
