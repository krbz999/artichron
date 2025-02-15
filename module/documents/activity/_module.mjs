import BaseActivity from "./base-activity.mjs";
import DamageActivity from "./damage-activity.mjs";
import DefendActivity from "./defend-activity.mjs";
import EffectActivity from "./effect-activity.mjs";
import HealingActivity from "./healing-activity.mjs";
import TeleportActivity from "./teleport-activity.mjs";

BaseActivity.TYPES = {
  [DamageActivity.metadata.type]: DamageActivity,
  [DefendActivity.metadata.type]: DefendActivity,
  [EffectActivity.metadata.type]: EffectActivity,
  [HealingActivity.metadata.type]: HealingActivity,
  [TeleportActivity.metadata.type]: TeleportActivity,
};

export default {
  BaseActivity,
  DamageActivity,
  DefendActivity,
  EffectActivity,
  HealingActivity,
  TeleportActivity,
};
