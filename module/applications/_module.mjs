import ActiveEffectSheetArtichron from "./effect/effect-sheet.mjs";
import ActivitySelectDialog from "./item/activity-select-dialog.mjs";
import ActivitySheet from "./activity-sheet.mjs";
import ActivityUseDialog from "./item/activity-use-dialog.mjs";
import ActorSheetArtichron from "./actor/actor-sheet-base.mjs";
import ArtichronSheetMixin from "./base-sheet.mjs";
import ChatLogArtichron from "./chatlog.mjs";
import CombatCarousel from "./combat/carousel.mjs";
import CombatTrackerArtichron from "./combat/tracker.mjs";
import ContextMenuArtichron from "./context-menu.mjs";
import DamageSheet from "./item/damage-sheet.mjs";
import HeroSheet from "./actor/hero-sheet.mjs";
import ItemFusionDialog from "./item/fusion-dialog.mjs";
import ItemSheetAmmunition from "./item/item-sheet-ammo.mjs";
import ItemSheetArtichron from "./item/item-sheet-base.mjs";
import ItemSheetElixir from "./item/item-sheet-elixir.mjs";
import ItemSheetPart from "./item/item-sheet-part.mjs";
import MerchantConfigurationDialog from "./actor/merchant-configuration-dialog.mjs";
import MerchantSheet from "./actor/merchant-sheet.mjs";
import MonsterSheet from "./actor/monster-sheet.mjs";
import PartyDistributionDialog from "./actor/party-distribution-dialog.mjs";
import PartyFundsDialog from "./actor/party-funds-dialog.mjs";
import PartySheet from "./actor/party-sheet.mjs";
import PoolConfig from "./actor/pool-config.mjs";
import RollConfigurationDialog from "./item/roll-configuration-dialog.mjs";
import TokenHUDArtichron from "./token/token-hud.mjs";
import TooltipsArtichron from "./tooltips.mjs";

export default {
  effect: {
    ActiveEffectSheetArtichron,
  },
  activity: {
    ActivitySelectDialog,
    ActivitySheet,
    ActivityUseDialog,
  },
  actor: {
    ActorSheetArtichron,
    HeroSheet,
    MerchantSheet,
    MonsterSheet,
    PartySheet,
  },
  api: {
    ArtichronSheetMixin,
  },
  sidebar: {
    tabs: {
      ChatLogArtichron,
      CombatTrackerArtichron,
    },
  },
  item: {
    DamageSheet,
    ItemSheetAmmunition,
    ItemSheetArtichron,
    ItemSheetElixir,
    ItemSheetPart,
  },
  apps: {
    ItemFusionDialog,
    MerchantConfigurationDialog,
    PartyDistributionDialog,
    PartyFundsDialog,
    PoolConfig,
    RollConfigurationDialog,
  },
  hud: {
    TokenHUDArtichron,
  },
  ui: {
    ContextMenuArtichron,
    CombatCarousel,
    TooltipsArtichron,
  },
};
