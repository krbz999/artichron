import BaseActivity from "./base-activity.mjs";
import ChatMessageArtichron from "../chat-message.mjs";
import RollConfigurationDialog from "../../applications/item/roll-configuration-dialog.mjs";

const {SchemaField, StringField} = foundry.data.fields;

export default class DefendActivity extends BaseActivity {
  /** @inheritdoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    type: "defend",
    label: "ARTICHRON.ACTIVITY.Types.Defend"
  }, {inplace: false}));

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
   * @returns {Promise<ChatMessageArtichron|null>}
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

    const actor = this.item.actor;

    // Prepare roll configuration dialog.
    const fieldsets = [{
      legend: game.i18n.format("ARTICHRON.ROLL.Defend.Pool"),
      fields: [{
        field: new foundry.data.fields.NumberField({
          integer: true,
          min: 0,
          max: actor.type === "monster" ? actor.system.danger.pool.value : actor.system.pools.stamina.value,
          nullable: false,
          label: "ARTICHRON.ROLL.Defend.PoolLabel",
          hint: "ARTICHRON.ROLL.Defend.PoolHint"
        }),
        options: {value: 0, name: "pool"}
      }]
    }];

    // TODO: allow consuming elixirs as part of defensive rolls?

    const config = {
      pool: 0,
      rollMode: game.settings.get("core", "rollMode")
    };

    const configuration = await RollConfigurationDialog.create({
      window: {title: game.i18n.format("ARTICHRON.ROLL.Defend.Title", {name: this.item.name})},
      fieldsets: fieldsets,
      document: this
    });
    if (!configuration) return null;
    foundry.utils.mergeObject(config, configuration);

    const roll = Roll.create(this.defend.formula, this.item.getRollData());
    if (config.pool) roll.alter(1, config.pool);
    if (!attr.has("blocking")) roll.alter(0.5);

    // Perform updates.
    if (this.item.actor.inCombat && this.item.actor.canPerformActionPoints(this.cost.value)) {
      await this.item.actor.spendActionPoints(this.cost.value);
    }
    const update = {};
    if (actor.type === "monster") update["system.danger.pool.spent"] = actor.system.danger.pool.spent + config.pool;
    else update["system.pools.stamina.spent"] = actor.system.pools.stamina.spent + config.pool;
    await actor.update(update);

    await roll.evaluate();

    const messageData = {
      flavor: game.i18n.format("ARTICHRON.ROLL.Defend.Flavor", {name: this.item.name}),
      speaker: ChatMessageArtichron.getSpeaker({actor: this.item.actor}),
      rolls: [roll]
    };
    ChatMessageArtichron.applyRollMode(messageData, config.rollMode);
    return ChatMessageArtichron.create(messageData);
  }
}
