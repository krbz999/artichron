import ActiveEffectDataModels from "./effect/_module.mjs";
import ActorDataModels from "./actor/_module.mjs";
import ChatMessageDataModels from "./chat/_module.mjs";
import CombatantDataModels from "./combat/_module.mjs";
import DocumentClasses from "./document-classes/_module.mjs";
import ItemDataModels from "./item/_module.mjs";
import ObjectClasses from "./object-classes/_module.mjs";
import RegionBehaviorDataModels from "./region/_module.mjs";
import TokenPlacement from "./canvas/token-placement.mjs";

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

export const documentClasses = Object.values(DocumentClasses).reduce((acc, cls) => {
  acc[cls.documentName] = cls;
  return acc;
}, {});

/* -------------------------------------------------- */

export const objectClasses = Object.values(ObjectClasses).reduce((acc, cls) => {
  acc[cls.embeddedName] = cls;
  return acc;
}, {});

/* -------------------------------------------------- */

export const helpers = {
  TokenPlacement
};
