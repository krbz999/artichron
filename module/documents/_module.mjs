import HeroData from "./actor/actor-hero.mjs";
import ActorArtichron from "./actor/actor.mjs";
import CombatArtichron from "./combat/combat.mjs";
import ArmorData from "./item/item-armor.mjs";
import WeaponData from "./item/item-weapon.mjs";
import ItemArtichron from "./item/item.mjs";

export const dataModels = {
  actor: {
    hero: HeroData
  },
  item: {
    armor: ArmorData,
    part: undefined, // todo
    shield: undefined, // todo
    spell: undefined, // todo
    weapon: WeaponData,
  }
};

export const documents = {
  actor: ActorArtichron,
  item: ItemArtichron,
  combat: CombatArtichron
};
