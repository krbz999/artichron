import SpellUseDialog from "../../applications/item/spell-use-dialog.mjs";
import EffectBuffData from "../effect/system-model.mjs";
import MeasuredTemplateArtichron from "../object-classes/measured-template.mjs";
import ArsenalData from "./item-arsenal.mjs";

const {NumberField, SchemaField, StringField, SetField} = foundry.data.fields;

export default class SpellData extends ArsenalData {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").ItemSystemModelMetadata}
   */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    defaultWeight: 1,
    order: 30,
    type: "spell"
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema()
    };
  }

  /* -------------------------------------------------- */

  // /** @override */
  // async use() {
  //   if ((this.category.subtype === "offense") && !this.hasDamage) {
  //     ui.notifications.warn("ARTICHRON.Warning.ItemHasNoDamageRolls", {localize: true});
  //     return null;
  //   }

  //   if (!this.parent.isEquipped) {
  //     ui.notifications.warn("ARTICHRON.Warning.ItemIsNotEquipped", {localize: true});
  //     return null;
  //   }

  //   if (!this.hasTemplate) {
  //     ui.notifications.warn("ARTICHRON.Warning.ItemHasNoTemplateTypes", {localize: true});
  //     return null;
  //   }

  //   if (!this.canUsePips) {
  //     ui.notifications.warn("ARTICHRON.Warning.MissingActionPoints", {localize: true});
  //     return null;
  //   }

  //   const configuration = await SpellUseDialog.create(this.parent);
  //   if (!configuration) return null;

  //   const data = SpellUseDialog.determineTemplateData(configuration);

  //   const flags = {artichron: {usage: {}}};

  //   if (data.type !== "single") {
  //     // Offensive spells placing templates can remove those at the end of the turn.
  //     // Otherwise, they should probably linger until combat ends.
  //     flags.artichron.usage.templates = {
  //       duration: this.category.subtype === "offense" ? "turn" : "combat",
  //       ...data
  //     };
  //   } else {
  //     // Case 2: Singular targets.
  //     flags.artichron.usage.target = {
  //       count: data.count,
  //       range: data.range
  //     };
  //   }

  //   // Create and perform updates.
  //   const actorUpdate = {};
  //   const itemUpdates = [];
  //   const actor = this.parent.actor;

  //   for (const id of configuration.boosters) {
  //     const elixir = actor.items.get(id);
  //     const update = elixir.system._usageUpdate();
  //     itemUpdates.push(update);
  //     configuration.cost--;
  //   }

  //   if (configuration.cost && (actor.type === "hero")) {
  //     const mana = actor.system.pools.mana.value;
  //     actorUpdate["system.pools.mana.value"] = mana - configuration.cost;
  //   }

  //   const messageData = {
  //     type: "usage",
  //     speaker: ChatMessage.implementation.getSpeaker({actor: actor}),
  //     "system.item": this.parent.uuid,
  //     flags: flags
  //   };

  //   if (this.category.subtype === "offense") {
  //     messageData.flags.artichron.usage.damage = {
  //       ids: [configuration.damage],
  //       addition: configuration.additional
  //     };
  //   } else if (this.category.subtype === "buff") {
  //     messageData.flags.artichron.usage.effect = {
  //       uuid: this.parent.effects.get(configuration.buff).uuid
  //     };
  //   }

  //   await Promise.all([
  //     foundry.utils.isEmpty(actorUpdate) ? null : actor.update(actorUpdate),
  //     foundry.utils.isEmpty(itemUpdates) ? null : actor.updateEmbeddedDocuments("Item", itemUpdates)
  //   ]);

  //   if (actor.inCombat) {
  //     await actor.spendActionPoints(this.parent.system.cost.value);
  //   }

  //   return ChatMessage.implementation.create(messageData);
  // }

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
}
