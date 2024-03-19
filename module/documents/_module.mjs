import HeroData from "./actor/actor-hero.mjs";
import ActorArtichron from "./actor/actor.mjs";
import CombatArtichron from "./combat/combat.mjs";
import ArmorData from "./item/item-armor.mjs";
import ArsenalData from "./item/item-arsenal.mjs";
import ElixirData from "./item/item-elixir.mjs";
import FoodData from "./item/item-food.mjs";
import PartData from "./item/item-part.mjs";
import ItemArtichron from "./item/item.mjs";
import MeasuredTemplateArtichron from "./template/template.mjs";
import TokenDocumentArtichron from "./token/token-document.mjs";
import TokenArtichron from "./token/token-placeable.mjs";

export const dataModels = {
  actor: {
    hero: HeroData
  },
  item: {
    armor: ArmorData,
    arsenal: ArsenalData,
    elixir: ElixirData,
    food: FoodData,
    part: PartData
  }
};

export const documents = {
  actor: ActorArtichron,
  item: ItemArtichron,
  combat: CombatArtichron,
  tokenDocument: TokenDocumentArtichron,
  token: TokenArtichron,
  template: MeasuredTemplateArtichron
};
