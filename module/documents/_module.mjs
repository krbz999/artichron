import ChatMessageSystemModel from "./chat/system-model.mjs";
import TradeMessageData from "./chat/trade-message.mjs";
import UsageMessageData from "./chat/usage-message.mjs";
import DamageMessageData from "./chat/damage-message.mjs";
import ActiveEffectArtichron from "./effect/active-effect.mjs";
import ActiveEffectSystemModel from "./effect/system-model.mjs";
import ActorArtichron from "./actor/actor.mjs";
import ActorSystemModel from "./actor/system-model.mjs";
import AmmunitionData from "./item/item-ammo.mjs";
import ArmorData from "./item/item-armor.mjs";
import ChatMessageArtichron from "./chat/chatmessage.mjs";
import CombatantArtichron from "./combat/combatant.mjs";
import CombatantSystemModel from "./combat/system-model.mjs";
import CombatArtichron from "./combat/combat.mjs";
import EffectBuffData from "./effect/buff-data.mjs";
import EffectConditionData from "./effect/condition-data.mjs";
import EffectEnhancementData from "./effect/enhancement-data.mjs";
import EffectFusionData from "./effect/fusion-data.mjs";
import ElixirData from "./item/item-elixir.mjs";
import HeroData from "./actor/actor-hero.mjs";
import ItemArtichron from "./item/item.mjs";
import ItemSystemModel from "./item/system-model.mjs";
import MeasuredTemplateArtichron from "./template/template.mjs";
import MeasuredTemplateDocumentArtichron from "./template/template-document.mjs";
import MerchantData from "./actor/actor-merchant.mjs";
import MonsterData from "./actor/actor-monster.mjs";
import PartData from "./item/item-part.mjs";
import ShieldData from "./item/item-arsenal-shield.mjs";
import SpellData from "./item/item-arsenal-spell.mjs";
import TokenArtichron from "./token/token-placeable.mjs";
import TokenDocumentArtichron from "./token/token-document.mjs";
import WeaponData from "./item/item-arsenal-weapon.mjs";

export const dataModels = {
  actor: {
    hero: HeroData,
    monster: MonsterData,
    merchant: MerchantData
  },
  item: {
    armor: ArmorData,
    shield: ShieldData,
    spell: SpellData,
    weapon: WeaponData,
    elixir: ElixirData,
    part: PartData,
    ammo: AmmunitionData
  },
  message: {
    damage: DamageMessageData,
    trade: TradeMessageData,
    usage: UsageMessageData
  },
  combatant: {
    artichron: CombatantSystemModel
  },
  effect: {
    buff: EffectBuffData,
    condition: EffectConditionData,
    enhancement: EffectEnhancementData,
    fusion: EffectFusionData
  }
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
