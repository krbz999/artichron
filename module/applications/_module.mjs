import ActiveEffectSheetArtichron from "./effect/effect-sheet.mjs";
import ActivitySelectDialog from "./item/activity-select-dialog.mjs";
import ActivitySheet from "./activity-sheet.mjs";
import ActivityUseDialog from "./item/activity-use-dialog.mjs";
import ActorSheetArtichron from "./actor/actor-sheet-base.mjs";
import Application from "./apps/application.mjs";
import ArtichronSheetMixin from "./base-sheet.mjs";
import ChatLogArtichron from "./chatlog.mjs";
import ClockSheet from "./clock-sheet.mjs";
import CombatCarousel from "./combat/carousel.mjs";
import CombatTrackerArtichron from "./combat/tracker.mjs";
import ContextMenuArtichron from "./context-menu.mjs";
import DamageSheet from "./item/damage-sheet.mjs";
import Dialog from "./apps/dialog.mjs";
import HeroSheet from "./actor/hero-sheet.mjs";
import ItemFusionDialog from "./item/fusion-dialog.mjs";
import ItemSheetArtichron from "./item/item-sheet-base.mjs";
import MerchantConfigurationDialog from "./actor/merchant-configuration-dialog.mjs";
import MerchantSheet from "./actor/merchant-sheet.mjs";
import MonsterSheet from "./actor/monster-sheet.mjs";
import PartyDistributionDialog from "./actor/party-distribution-dialog.mjs";
import PartyFundsDialog from "./actor/party-funds-dialog.mjs";
import PartySheet from "./actor/party-sheet.mjs";
import PoolConfig from "./actor/pool-config.mjs";
import PseudoDocumentSheet from "./pseudo-document-sheet.mjs";
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
    Application,
    ArtichronSheetMixin,
    Dialog,
    PseudoDocumentSheet,
  },
  sidebar: {
    tabs: {
      ChatLogArtichron,
      CombatTrackerArtichron,
    },
  },
  item: {
    ClockSheet,
    DamageSheet,
    ItemSheetArtichron,
  },
  apps: {
    ItemFusionDialog,
    MerchantConfigurationDialog,
    PartyDistributionDialog,
    PartyFundsDialog,
    PoolConfig,
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
