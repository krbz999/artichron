import BossData from "./actor/actor-boss.mjs";
import HeroData from "./actor/actor-hero.mjs";
import MerchantData from "./actor/actor-merchant.mjs";
import MonsterData from "./actor/actor-monster.mjs";
import ArmorData from "./item/item-armor.mjs";
import ShieldData from "./item/item-shield.mjs";
import SpellData from "./item/item-spell.mjs";
import WeaponData from "./item/item-weapon.mjs";

const dataModels = {
  actor: {
    hero: HeroData,
    merchant: MerchantData,
    monster: MonsterData,
    boss: BossData
  },
  item: {
    weapon: WeaponData,
    shield: ShieldData,
    spell: SpellData,
    armor: ArmorData
  }
};

export default dataModels;
