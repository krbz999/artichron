export const SYSTEM = {};

/* -------------------------------------------------- */

/**
 * @typedef {object} DamageTypeConfig
 * @property {string} label             Displayed label of the damage type.
 * @property {string} color             Associated default color.
 * @property {string} icon              FA icon used for the damage type.
 * @property {string} group             An optgroup key to put this damage type in for rendering.
 * @property {boolean} [resist]         Whether this damage type can be resisted.
 * @property {boolean} [armor]          Whether this damage type is resisted by armor rating.
 */

/**
 * Damage types and relevant properties.
 * @enum {DamageTypeConfig}
 */
export const DAMAGE_TYPES = {
  fire: {
    label: "ARTICHRON.DamageType.Fire",
    color: "FF5733",
    icon: "fa-solid fa-fire",
    group: "elemental",
    resist: true,
  },
  wind: {
    label: "ARTICHRON.DamageType.Wind",
    color: "8DEEB5",
    icon: "fa-solid fa-wind",
    group: "elemental",
    resist: true,
  },
  lightning: {
    label: "ARTICHRON.DamageType.Lightning",
    color: "4B70A8",
    icon: "fa-solid fa-bolt",
    group: "elemental",
    resist: true,
  },
  ice: {
    label: "ARTICHRON.DamageType.Ice",
    color: "54D7E0",
    icon: "fa-solid fa-snowflake",
    group: "elemental",
    resist: true,
  },
  light: {
    label: "ARTICHRON.DamageType.Light",
    color: "FCFFBF",
    icon: "fa-solid fa-sun",
    group: "planar",
    resist: true,
  },
  darkness: {
    label: "ARTICHRON.DamageType.Darkness",
    color: "910B94",
    icon: "fa-solid fa-moon",
    group: "planar",
    resist: true,
  },
  physical: {
    label: "ARTICHRON.DamageType.Physical",
    color: "868686",
    icon: "fa-solid fa-hand-fist",
    group: "physical",
    armor: true,
  },
  arcane: {
    label: "ARTICHRON.DamageType.Arcane",
    color: "C79FFF",
    icon: "fa-solid fa-wand-sparkles",
    group: "planar",
    resist: true,
  },
};

Object.defineProperty(DAMAGE_TYPES, "optgroups", {
  get: function() {
    const groups = Object.entries(artichron.config.DAMAGE_TYPE_GROUPS).map(([k, { label }]) => {
      const arr = [];
      for (const [u, v] of Object.entries(this)) {
        if (v.group === k) arr.push({ value: u, label: v.label, group: label });
      }
      return arr;
    });

    return groups.flat();
  },
});

/* -------------------------------------------------- */

/**
 * @typedef {object} DamageTypeGroupConfig
 * @property {string} label     The human-readable label of this damage group.
 */

/**
 * Damage group types.
 * @enum {DamageTypeGroupConfig}
 */
export const DAMAGE_TYPE_GROUPS = {
  physical: {
    label: "ARTICHRON.DamageTypeGroup.Physical",
  },
  elemental: {
    label: "ARTICHRON.DamageTypeGroup.Elemental",
  },
  planar: {
    label: "ARTICHRON.DamageTypeGroup.Planar",
  },
};

/* -------------------------------------------------- */

/**
 * Configuration data for healing.
 * @property {string} label   Human-readable label.
 * @property {string} color   The color.
 * @property {string} icon    The FA icon.
 */
export const HEALING = {
  label: "ARTICHRON.HEALING.healing",
  color: "379e00",
  icon: "fa-solid fa-staff-snake",
};

/* -------------------------------------------------- */

/**
 * @typedef {object} TargetTypeConfig
 * @property {string} label           Displayed label of the targeting type.
 * @property {Set<string>} scale      The properties that can scale with mana.
 * @property {boolean} isAttached     Is this template type locked to a token during preview?
 * @property {boolean} isArea         Whether this is a target type for individual targets or an area.
 */

/**
 * The types of area targeting, enumerating both configurations for spell areas and upscaling
 * with mana, as well as what blast zones a piece of ammo can create.
 * @enum {TargetTypeConfig}
 */
export const TARGET_TYPES = {
  self: {
    label: "ARTICHRON.TargetTypes.Self",
    scale: new Set(),
    isAttached: false,
    isArea: false,
  },
  single: {
    label: "ARTICHRON.TargetTypes.SingleTarget",
    scale: new Set(["count", "range"]),
    isAttached: false,
    isArea: false,
  },
  ray: {
    label: "ARTICHRON.TargetTypes.AreaRay",
    scale: new Set(["count", "size", "width"]),
    isAttached: true,
    isArea: true,
  },
  cone: {
    label: "ARTICHRON.TargetTypes.AreaCone",
    scale: new Set(["count", "size"]),
    isAttached: true,
    isArea: true,
  },
  circle: {
    label: "ARTICHRON.TargetTypes.AreaCircle",
    scale: new Set(["count", "size", "range"]),
    isAttached: false,
    isArea: true,
  },
  radius: {
    label: "ARTICHRON.TargetTypes.AreaRadius",
    scale: new Set(["size"]),
    isAttached: true,
    isArea: true,
  },
};

Object.defineProperty(TARGET_TYPES, "optgroups", {
  get: function() {
    const { self, single, ...rest } = this;
    const options = [];
    options.push(
      { value: "self", label: self.label },
      { value: "single", label: single.label },
    );
    const grp = game.i18n.localize("ARTICHRON.TargetTypes.AreaOfEffect");
    options.push(...Object.entries(rest).map(([k, v]) => ({ value: k, label: v.label, group: grp })));
    return options;
  },
});

/* -------------------------------------------------- */

/**
 * @typedef {object} EquipmentCategoryConfig
 * @property {string} label     The human-readable label of this equipment category.
 */

/**
 * Armor categories.
 * @enum {EquipmentCategoryConfig}
 */
export const EQUIPMENT_CATEGORIES = {
  clothing: {
    label: "ARTICHRON.EQUIPMENT.CATEGORY.Clothing",
  },
  natural: {
    label: "ARTICHRON.EQUIPMENT.CATEGORY.Natural",
  },
  tech: {
    label: "ARTICHRON.EQUIPMENT.CATEGORY.Tech",
  },
};

/* -------------------------------------------------- */

/**
 * @typedef {object} EquipmentTypeConfig
 * @property {string} label     The human-readable label of this equipment type.
 */

/**
 * Equipment subtypes.
 * @enum {EquipmentTypeConfig}
 */
export const EQUIPMENT_TYPES = {
  accessory: {
    label: "ARTICHRON.ArmorType.Accessory",
  },
  arms: {
    label: "ARTICHRON.ArmorType.Arms",
  },
  chest: {
    label: "ARTICHRON.ArmorType.Chest",
  },
  head: {
    label: "ARTICHRON.ArmorType.Head",
  },
  legs: {
    label: "ARTICHRON.ArmorType.Legs",
  },
  boots: {
    label: "ARTICHRON.ArmorType.Boots",
  },
};

/* -------------------------------------------------- */

/**
 * @typedef {object} EffectDurationConfig
 * @property {string} label     The human-readable label of this effect duration type.
 */

/**
 * Effect duration types.
 * @enum {EffectDurationConfig}
 */
export const EFFECT_EXPIRATION_TYPES = {
  none: { label: "ARTICHRON.EffectDurations.None" },
  combat: { label: "ARTICHRON.EffectDurations.Combat" },
  day: { label: "ARTICHRON.EffectDurations.Day" },
};

/* -------------------------------------------------- */

/**
 * @typedef {object} TemplateDurationConfig
 * @property {string} label     The human-readable label of this template duration type.
 */

/**
 * Template duration types.
 * @enum {TemplateDurationConfig}
 */
export const TEMPLATE_DURATIONS = {
  none: {
    label: "ARTICHRON.TemplateDurations.None",
  },
  combat: {
    label: "ARTICHRON.TemplateDurations.Combat",
  },
  round: {
    label: "ARTICHRON.TemplateDurations.Round",
  },
  turn: {
    label: "ARTICHRON.TemplateDurations.Turn",
  },
};

/* -------------------------------------------------- */

/**
 * @typedef {object} ItemAttributeConfig
 * @property {string} label               The human-readable label of this item attribute.
 * @property {Set<string>} [types]        A set of item types this can be an option for.
 *                                        If empty or omitted, then all types.
 * @property {boolean} [transferrable]    If explicitly false, this attribute will not be
 *                                        transferred automatically via fusions.
 * @property {string} [status]            What status is applied if taking damage from an item with this attribute?
 */

/**
 * Various item attributes.
 * @enum {ItemAttributeConfig}
 */
export const ITEM_ATTRIBUTES = {
  // ammunition: {
  //   label: "ARTICHRON.ItemAttribute.Ammunition",
  //   types: new Set(["weapon"]),
  //   transferrable: false,
  // },
  // bludgeoning: {
  //   label: "ARTICHRON.ItemAttribute.Bludgeoning",
  //   types: new Set(["weapon"]),
  //   transferrable: true,
  //   status: "hindered",
  // },
  booster: {
    label: "ARTICHRON.ATTRIBUTES.booster",
    types: new Set(["elixir"]),
    transferrable: false,
  },
  fusion: {
    label: "ARTICHRON.ATTRIBUTES.fusion",
    types: new Set(["armor"]),
    transferrable: false,
  },
  heavy: {
    label: "ARTICHRON.ATTRIBUTES.heavy",
    types: new Set(["armor"]),
    transferrable: true,
  },
  irreducible: {
    label: "ARTICHRON.ATTRIBUTES.irreducible",
    types: new Set(["spell"]),
    transferrable: true,
  },
  magical: {
    label: "ARTICHRON.ATTRIBUTES.magical",
    types: new Set(["ammo", "armor", "spell", "part"]),
    transferrable: true,
  },
  mixed: {
    label: "ARTICHRON.ATTRIBUTES.mixed",
    types: new Set(["path"]),
    transferrable: false,
  },
  // parrying: {
  //   label: "ARTICHRON.ItemAttribute.Parrying",
  //   types: new Set(["spell"]),
  //   transferrable: true,
  // },
  // rending: {
  //   label: "ARTICHRON.ItemAttribute.Rending",
  //   types: new Set(["spell"]),
  //   transferrable: true,
  //   status: "bleeding",
  // },
  spellcaster: {
    label: "ARTICHRON.ATTRIBUTES.spellcaster",
    types: new Set(["path"]),
  },
  twoHanded: {
    label: "ARTICHRON.ATTRIBUTES.twoHanded",
    types: new Set(["spell"]),
    transferrable: true,
  },
};

/* -------------------------------------------------- */

/**
 * @typedef {object} StatusConditionConfig
 * @property {string} name          The displayed name of the condition.
 * @property {string} img           The displayed image of the condition.
 * @property {number} [levels]      The amount of stacking levels of the condition.
 * @property {boolean} hud          Whether this appears on the token hud.
 * @property {string} reference     The uuid of a journal entry page that contains the details of this condition.
 * @property {"toggle"|"leveled"|"buff"} [group]    Status group for token HUD.
 */

/**
 * The status conditions available.
 * @enum {StatusConditionConfig}
 */
export const STATUS_CONDITIONS = {
  defeated: {
    name: "ARTICHRON.CONDITIONS.defeated",
    img: "systems/artichron/assets/icons/conditions/defeated.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "TODO",
    group: "toggle",
  },
  blind: {
    name: "ARTICHRON.CONDITIONS.blind",
    img: "systems/artichron/assets/icons/conditions/blind.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "TODO",
    group: "toggle",
  },
  bloodied: {
    name: "ARTICHRON.CONDITIONS.bloodied",
    img: "systems/artichron/assets/icons/conditions/bloodied.svg",
    hud: false,
    reference: "TODO",
  },
  critical: {
    name: "ARTICHRON.CONDITIONS.critical",
    img: "systems/artichron/assets/icons/conditions/critical.svg",
    hud: false,
    reference: "TODO",
  },
  hindered: {
    name: "ARTICHRON.CONDITIONS.hindered",
    img: "systems/artichron/assets/icons/conditions/hindered.svg",
    levels: 10,
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.uVv9k9xheOkxzBhO",
    group: "leveled",
  },
  invisible: {
    name: "ARTICHRON.CONDITIONS.invisible",
    img: "systems/artichron/assets/icons/conditions/invisible.svg",
    hud: true,
    reference: "TODO",
    group: "toggle",
  },
  // TODO: consider removing this entirely.
  underground: {
    name: "ARTICHRON.CONDITIONS.underground",
    img: "icons/svg/mole.svg",
    hud: false,
    reference: "TODO",
    group: "toggle",
  },
  flying: {
    name: "ARTICHRON.CONDITIONS.flying",
    img: "systems/artichron/assets/icons/conditions/flying.svg",
    hud: true,
    reference: "TODO",
    group: "toggle",
  },
  // TODO: consider removing this entirely.
  levitating: {
    name: "ARTICHRON.CONDITIONS.levitating",
    img: "icons/svg/wingfoot.svg",
    hud: false,
    reference: "TODO",
    group: "toggle",
  },
  bleeding: {
    name: "ARTICHRON.CONDITIONS.bleeding",
    img: "systems/artichron/assets/icons/conditions/bleeding.svg",
    levels: 10,
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.nIvx3xXwYP9iGSeh",
    group: "leveled",
  },
  burning: {
    name: "ARTICHRON.CONDITIONS.burning",
    img: "systems/artichron/assets/icons/conditions/burning.svg",
    levels: 10,
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.3VoSsDfCrBGG8Bzy",
    group: "leveled",
  },
  injured: {
    name: "ARTICHRON.CONDITIONS.injured",
    img: "systems/artichron/assets/icons/conditions/injured.svg",
    levels: 20,
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.FRQ8zjWTfTYZWGx3",
    group: "leveled",
  },
  physAtkUp: {
    name: "ARTICHRON.CONDITIONS.physAtkUp",
    img: "systems/artichron/assets/icons/conditions/physical-attack-up.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.0iBopTnnWkmkN9kK",
    group: "buff",
  },
  physAtkDown: {
    name: "ARTICHRON.CONDITIONS.physAtkDown",
    img: "systems/artichron/assets/icons/conditions/physical-attack-down.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.ZoEO3S8EJCRPu53v",
    group: "buff",
  },
  physDefUp: {
    name: "ARTICHRON.CONDITIONS.physDefUp",
    img: "systems/artichron/assets/icons/conditions/physical-defense-up.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.JBjVW6bkIC4DWWw9",
    group: "buff",
  },
  physDefDown: {
    name: "ARTICHRON.CONDITIONS.physDefDown",
    img: "systems/artichron/assets/icons/conditions/physical-defense-down.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.k5rl3B6Im0RDUlxF",
    group: "buff",
  },
  elemAtkUp: {
    name: "ARTICHRON.CONDITIONS.elemAtkUp",
    img: "systems/artichron/assets/icons/conditions/elemental-attack-up.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.0iBopTnnWkmkN9kK",
    group: "buff",
  },
  elemAtkDown: {
    name: "ARTICHRON.CONDITIONS.elemAtkDown",
    img: "systems/artichron/assets/icons/conditions/elemental-attack-down.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.ZoEO3S8EJCRPu53v",
    group: "buff",
  },
  elemDefUp: {
    name: "ARTICHRON.CONDITIONS.elemDefUp",
    img: "systems/artichron/assets/icons/conditions/elemental-defense-up.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.JBjVW6bkIC4DWWw9",
    group: "buff",
  },
  elemDefDown: {
    name: "ARTICHRON.CONDITIONS.elemDefDown",
    img: "systems/artichron/assets/icons/conditions/elemental-defense-down.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.k5rl3B6Im0RDUlxF",
    group: "buff",
  },
  planAtkUp: {
    name: "ARTICHRON.CONDITIONS.planAtkUp",
    img: "systems/artichron/assets/icons/conditions/planar-attack-up.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.0iBopTnnWkmkN9kK",
    group: "buff",
  },
  planAtkDown: {
    name: "ARTICHRON.CONDITIONS.planAtkDown",
    img: "systems/artichron/assets/icons/conditions/planar-attack-down.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.ZoEO3S8EJCRPu53v",
    group: "buff",
  },
  planDefUp: {
    name: "ARTICHRON.CONDITIONS.planDefUp",
    img: "systems/artichron/assets/icons/conditions/planar-defense-up.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.JBjVW6bkIC4DWWw9",
    group: "buff",
  },
  planDefDown: {
    name: "ARTICHRON.CONDITIONS.planDefDown",
    img: "systems/artichron/assets/icons/conditions/planar-defense-down.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.k5rl3B6Im0RDUlxF",
    group: "buff",
  },
};

/* -------------------------------------------------- */

/**
 * @typedef {object} SkillConfig
 * @property {string} label     The displayed label of the skill group.
 * @property {string} img       Displayed image for this skill.
 */

/**
 * The skills available.
 * @type {Record<string, SkillConfig>}
 */
export const SKILLS = {
  agility: {
    label: "ARTICHRON.SKILL.agility",
    img: "systems/artichron/assets/icons/skills/agility.svg",
  },
  brawn: {
    label: "ARTICHRON.SKILL.brawn",
    img: "systems/artichron/assets/icons/skills/brawn.svg",
  },
  mind: {
    label: "ARTICHRON.SKILL.mind",
    img: "systems/artichron/assets/icons/skills/mind.svg",
  },
  spirit: {
    label: "ARTICHRON.SKILL.spirit",
    img: "systems/artichron/assets/icons/skills/spirit.svg",
  },
};

/* -------------------------------------------------- */

/**
 * @typedef {object} PoolConfig
 * @property {string} label     The displayed label of the pool.
 * @property {boolean} boost    When using this pool, can it be boosted by an elixir?
 */

/**
 * The pools used by a character.
 * @enum {PoolConfig}
 */
export const POOL_TYPES = {
  health: {
    label: "ARTICHRON.Pools.Health",
    boost: false,
  },
  stamina: {
    label: "ARTICHRON.Pools.Stamina",
    boost: true,
  },
  mana: {
    label: "ARTICHRON.Pools.Mana",
    boost: true,
  },
};

/* -------------------------------------------------- */

/**
 * @typedef {object} ProgressionThresholdConfig
 * @property {string} label         The human-readable label of this threshold.
 * @property {number} level         The numeric value of the given rank.
 * @property {number} threshold     The threshold that must be met to attain this rank.
 */

/**
 * The thresholds that can be met to achieve a 'level'.
 * @type {ProgressionThresholdConfig[]}
 */
export const PROGRESSION_THRESHOLDS = [{
  label: "ARTICHRON.PROGRESSION.THRESHOLDS.novice",
  level: 1,
  threshold: 0,
}, {
  label: "ARTICHRON.PROGRESSION.THRESHOLDS.experienced",
  level: 2,
  threshold: 20,
}, {
  label: "ARTICHRON.PROGRESSION.THRESHOLDS.veteran",
  level: 3,
  threshold: 50,
}];

/* -------------------------------------------------- */

/**
 * @typedef CorePathConfiguration
 * @property {string} label   Human-readable label.
 * @property {string} uuid    The uuid to the core path item.
 * @property {Proxy} mixed    Proxy object to retrieve a resulting mixed path.
 */

/** @type {Record<string, CorePathConfiguration>} */
export const PROGRESSION_CORE_PATHS = {
  cleric: {
    label: "ARTICHRON.PROGRESSION.LABELS.cleric",
    uuid: "Compendium.artichron.items.Item.TOPOCY0zrPjEj59G",
    mixed: {},
  },
  fighter: {
    label: "ARTICHRON.PROGRESSION.LABELS.fighter",
    uuid: "Compendium.artichron.items.Item.UrSG9mEumnMbTIrM",
    mixed: {},
  },
  mage: {
    label: "ARTICHRON.PROGRESSION.LABELS.mage",
    uuid: "Compendium.artichron.items.Item.7i6uNxcreJWoO4C9",
    mixed: {},
  },
  rogue: {
    label: "ARTICHRON.PROGRESSION.LABELS.rogue",
    uuid: "Compendium.artichron.items.Item.1LlHcgghhPrbJjIi",
    mixed: {},
  },
};

/* -------------------------------------------------- */

/**
 * @typedef MixedPathConfiguration
 * @property {string} label   Human-readable label.
 * @property {string} uuid    The uuid to the path item.
 */

/** @type {Record<string, MixedPathConfiguration>} */
export const PROGRESSION_MIXED_PATHS = {
  inquisitor: {
    label: "ARTICHRON.PROGRESSION.LABELS.inquisitor",
    uuid: "Compendium.artichron.items.Item.WuJqNVsC1LKvvPjF",
  },
  shaman: {
    label: "ARTICHRON.PROGRESSION.LABELS.shaman",
    uuid: "Compendium.artichron.items.Item.SzGVudF2sfodAy9O",
  },
  spellblade: {
    label: "ARTICHRON.PROGRESSION.LABELS.spellblade",
    uuid: "Compendium.artichron.items.Item.59ScnAaMmCDPtZfe",
  },
  swashbuckler: {
    label: "ARTICHRON.PROGRESSION.LABELS.swashbuckler",
    uuid: "Compendium.artichron.items.Item.MRLCVc7ewf3y4T91",
  },
  templar: {
    label: "ARTICHRON.PROGRESSION.LABELS.templar",
    uuid: "Compendium.artichron.items.Item.VzLWOrUWzibGNClQ",
  },
  warlock: {
    label: "ARTICHRON.PROGRESSION.LABELS.warlock",
    uuid: "Compendium.artichron.items.Item.WJltuDU36z2v0hH1",
  },
};

for (const k in PROGRESSION_CORE_PATHS) {
  PROGRESSION_CORE_PATHS[k].mixed = new Proxy(PROGRESSION_CORE_PATHS[k].mixed, { get(target, prop, receiver) {
    if (!prop) return undefined;
    prop = [k, prop].sort((a, b) => a.localeCompare(b)).join(":");
    prop = {
      "cleric:fighter": "templar",
      "cleric:mage": "shaman",
      "cleric:rogue": "inquisitor",
      "fighter:mage": "spellblade",
      "fighter:rogue": "swashbuckler",
      "mage:rogue": "warlock",
    }[prop];
    return prop;
  } });
}

export const PROGRESSION_VALUES = {
  relative: {
    lower: 45,
    upper: 55,
  },
  // If any path has more than this, use relative.
  // You also cannot be mixed-path unless meeting this.
  absolute: 10,
};

/* -------------------------------------------------- */

/**
 * @typedef ScaleValueSubtypeConfiguration
 * @property {string} label   Human-readable label.
 */

/**
 * Advancement scale value subtypes.
 * @type {Record<string, ScaleValueSubtypeConfiguration>}
 */
export const ADVANCEMENT_SCALE_VALUE_TYPES = {
  number: {
    label: "ARTICHRON.ADVANCEMENT.SCALE_VALUE.SUBTYPE.number",
  },
  dice: {
    label: "ARTICHRON.ADVANCEMENT.SCALE_VALUE.SUBTYPE.dice",
  },
};

/* -------------------------------------------------- */

/**
 * @typedef {object} BasicAttackConfiguration
 * @property {string} label                                     Human-readlable label.
 * @property {BaseDamageConfiguration} damage                   Base damage configuration.
 * @property {Record<string, AttackTypeConfiguration>} types    The attack types.
 */

/**
 * @typedef {object} BaseDamageConfiguration
 * @property {number} number          Base number of dice.
 * @property {number} denomination    Base denomination of the dice.
 */

/**
 * @typedef {object} AttackTypeConfiguration
 * @property {string} label         Human-readable label.
 * @property {string} damageType    Default damage type.
 */

/** @enum {BasicAttackConfiguration} */
export const BASIC_ATTACKS = {
  melee: {
    label: "ARTICHRON.ATTACK.melee",
    damage: {
      number: 2,
      denomination: 10,
    },
    types: {
      blade: {
        label: "ARTICHRON.ATTACK.TYPES.blade",
        damageType: "physical",
      },
      fist: {
        label: "ARTICHRON.ATTACK.TYPES.fist",
        damageType: "physical",
      },
      grasp: {
        label: "ARTICHRON.ATTACK.TYPES.grasp",
        damageType: "wind",
      },
    },
  },
  range: {
    label: "ARTICHRON.ATTACK.range",
    damage: {
      number: 2,
      denomination: 10,
    },
    types: {
      bow: {
        label: "ARTICHRON.ATTACK.TYPES.bow",
        damageType: "physical",
      },
      firearm: {
        label: "ARTICHRON.ATTACK.TYPES.firearm",
        damageType: "physical",
      },
      invocation: {
        label: "ARTICHRON.ATTACK.TYPES.invocation",
        damageType: "wind",
      },
    },
  },
};

Object.defineProperty(BASIC_ATTACKS, "optgroups", {
  get: function() {
    const groups = [];
    for (const [k, v] of Object.entries(BASIC_ATTACKS.melee.types)) {
      groups.push({ value: k, label: v.label, group: BASIC_ATTACKS.melee.label });
    }
    for (const [k, v] of Object.entries(BASIC_ATTACKS.range.types)) {
      groups.push({ value: k, label: v.label, group: BASIC_ATTACKS.range.label });
    }
    return groups;
  },
});

/* -------------------------------------------------- */

/**
 * The subtypes for a skill trait advancement choice.
 * @type {Record<string, {label: string}>}
 */
export const TRAIT_SKILL_SUBTYPES = {
  diceNumber: {
    label: "ARTICHRON.TRAITS.skillDiceNumber",
  },
  diceFaces: {
    label: "ARTICHRON.TRAITS.skillDiceFaces",
  },
  bonus: {
    label: "ARTICHRON.TRAITS.skillBonus",
  },
};
