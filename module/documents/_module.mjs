import BossData from "./actor/actor-boss.mjs";
import HeroData from "./actor/actor-hero.mjs";
import MerchantData from "./actor/actor-merchant.mjs";
import MonsterData from "./actor/actor-monster.mjs";
import ActorArtichron from "./actor/actor.mjs";
import CombatArtichron from "./combat/combat.mjs";
import ArmorData from "./item/item-armor.mjs";
import MonsterPartData from "./item/item-part.mjs";
import ShieldData from "./item/item-shield.mjs";
import SpellData from "./item/item-spell.mjs";
import WeaponData from "./item/item-weapon.mjs";
import ItemArtichron from "./item/item.mjs";

export const dataModels = {
  actor: {
    boss: BossData,
    hero: HeroData,
    merchant: MerchantData,
    monster: MonsterData,
  },
  item: {
    armor: ArmorData,
    part: MonsterPartData,
    shield: ShieldData,
    spell: SpellData,
    weapon: WeaponData,
  }
};

export const documents = {
  actor: ActorArtichron,
  item: ItemArtichron,
  combat: CombatArtichron
};
