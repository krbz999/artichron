import HeroData from "./actor/actor-hero.mjs";
import ActorArtichron from "./actor/actor.mjs";
import CombatArtichron from "./combat/combat.mjs";
import CombatantArtichron from "./combat/combatant.mjs";
import ArmorData from "./item/item-armor.mjs";
import ElixirData from "./item/item-elixir.mjs";
import PartData from "./item/item-part.mjs";
import ItemArtichron from "./item/item.mjs";
import MeasuredTemplateArtichron from "./template/template.mjs";
import TokenDocumentArtichron from "./token/token-document.mjs";
import TokenArtichron from "./token/token-placeable.mjs";
import ChatMessageArtichron from "./chat/chatmessage.mjs";
import MeasuredTemplateDocumentArtichron from "./template/template-document.mjs";
import SpellData from "./item/item-arsenal-spell.mjs";
import WeaponData from "./item/item-arsenal-weapon.mjs";
import ShieldData from "./item/item-arsenal-shield.mjs";
import {ChatMessageSystemModel, ItemMessageData, TradeMessageData} from "./chat/system-model.mjs";
import CombatantSystemModel from "./combat/system-model.mjs";
import {
  ActiveEffectSystemModel,
  EffectBuffData,
  EffectConditionData,
  EffectEnhancementData,
  EffectFusionData
} from "./effect/system-model.mjs";
import ActiveEffectArtichron from "./effect/active-effect.mjs";
import {ItemSystemModel} from "./item/system-model.mjs";
import {ActorSystemModel} from "./actor/system-model.mjs";
import AmmunitionData from "./item/item-ammo.mjs";
import MerchantData from "./actor/actor-merchant.mjs";
import MonsterData from "./actor/actor-monster.mjs";

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
    usage: ItemMessageData,
    trade: TradeMessageData
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
