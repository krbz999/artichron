import ActiveEffectArtichron from "./active-effect.mjs";
import ActiveEffectDataModels from "./effect/_module.mjs";
import ActorArtichron from "./actor.mjs";
import ActorDataModels from "./actor/_module.mjs";
import ChatMessageArtichron from "./chat-message.mjs";
import ChatMessageDataModels from "./chat/_module.mjs";
import CombatantArtichron from "./combatant.mjs";
import CombatantDataModels from "./combat/_module.mjs";
import CombatArtichron from "./combat.mjs";
import ItemArtichron from "./item.mjs";
import ItemDataModels from "./item/_module.mjs";
import RegionBehaviorDataModels from "./region/_module.mjs";
import TokenDocumentArtichron from "./token.mjs";

const assign = models => {
  return Object.values(models).reduce((acc, cls) => {
    acc[cls.metadata.type] = cls;
    return acc;
  }, {});
};

export const dataModels = {
  ActiveEffect: assign(ActiveEffectDataModels),
  Actor: assign(ActorDataModels),
  ChatMessage: assign(ChatMessageDataModels),
  Combatant: assign(CombatantDataModels),
  Item: assign(ItemDataModels),
  RegionBehavior: assign(RegionBehaviorDataModels)
};

/* -------------------------------------------------- */

export const documentClasses = {
  [ActiveEffectArtichron.documentName]: ActiveEffectArtichron,
  [ActorArtichron.documentName]: ActorArtichron,
  [ChatMessageArtichron.documentName]: ChatMessageArtichron,
  [CombatantArtichron.documentName]: CombatantArtichron,
  [CombatArtichron.documentName]: CombatArtichron,
  [ItemArtichron.documentName]: ItemArtichron,
  [TokenDocumentArtichron.documentName]: TokenDocumentArtichron
};
