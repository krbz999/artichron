import ActiveEffectArtichron from "./effect/active-effect.mjs";
import ActiveEffectDataModels from "./effect/_module.mjs";
import ActiveEffectSystemModel from "./effect/system-model.mjs";
import ActorArtichron from "./actor/actor.mjs";
import ActorDataModels from "./actor/_module.mjs";
import ActorSystemModel from "./actor/system-model.mjs";
import ChatMessageArtichron from "./chat/chatmessage.mjs";
import ChatMessageDataModels from "./chat/_module.mjs";
import ChatMessageSystemModel from "./chat/system-model.mjs";
import CombatantArtichron from "./combat/combatant.mjs";
import CombatantDataModels from "./combat/_module.mjs";
import CombatArtichron from "./combat/combat.mjs";
import ItemArtichron from "./item/item.mjs";
import ItemDataModels from "./item/_module.mjs";
import ItemSystemModel from "./item/system-model.mjs";
import MeasuredTemplateArtichron from "./template/template.mjs";
import MeasuredTemplateDocumentArtichron from "./template/template-document.mjs";
import RegionBehaviorDataModels from "./region/_module.mjs";
import TokenArtichron from "./token/token-placeable.mjs";
import TokenDocumentArtichron from "./token/token-document.mjs";
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

export const templates = {
  ActorSystemModel,
  ItemSystemModel,
  ChatMessageSystemModel,
  ActiveEffectSystemModel
};

/* -------------------------------------------------- */

export const documentClasses = {
  actor: ActorArtichron,
  item: ItemArtichron,
  combat: CombatArtichron,
  combatant: CombatantArtichron,
  tokenDocument: TokenDocumentArtichron,
  token: TokenArtichron,
  template: MeasuredTemplateArtichron,
  templateDocument: MeasuredTemplateDocumentArtichron,
  message: ChatMessageArtichron,
  effect: ActiveEffectArtichron
};

/* -------------------------------------------------- */

export const helpers = {
  TokenPlacement
};
