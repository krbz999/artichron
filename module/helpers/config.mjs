export const SYSTEM = {};

/* -------------------------------------------------- */

/**
 * @typedef {object} DamageTypeConfig
 * @property {string} label   Human-readable label.
 * @property {string} color   Associated default color.
 * @property {string} img     Filepath to the SVG icon.
 * @property {string} group   An optgroup key to put this damage type in for rendering.
 */

/**
 * Damage types and relevant properties.
 * @enum {DamageTypeConfig}
 */
export const DAMAGE_TYPES = {
  fire: {
    label: "ARTICHRON.DamageType.Fire",
    color: "FF5733",
    img: "systems/artichron/assets/icons/damage/elemental-fire.svg",
    group: "elemental",
  },
  wind: {
    label: "ARTICHRON.DamageType.Wind",
    color: "8DEEB5",
    img: "systems/artichron/assets/icons/damage/elemental-wind.svg",
    group: "elemental",
  },
  lightning: {
    label: "ARTICHRON.DamageType.Lightning",
    color: "4B70A8",
    img: "systems/artichron/assets/icons/damage/elemental-lightning.svg",
    group: "elemental",
  },
  ice: {
    label: "ARTICHRON.DamageType.Ice",
    color: "54D7E0",
    img: "systems/artichron/assets/icons/damage/elemental-ice.svg",
    group: "elemental",
  },
  light: {
    label: "ARTICHRON.DamageType.Light",
    color: "FCFFBF",
    img: "systems/artichron/assets/icons/damage/planar-light.svg",
    group: "planar",
  },
  darkness: {
    label: "ARTICHRON.DamageType.Darkness",
    color: "910B94",
    img: "systems/artichron/assets/icons/damage/planar-darkness.svg",
    group: "planar",
  },
  physical: {
    label: "ARTICHRON.DamageType.Physical",
    color: "868686",
    img: "systems/artichron/assets/icons/damage/physical.svg",
    group: "physical",
  },
  arcane: {
    label: "ARTICHRON.DamageType.Arcane",
    color: "C79FFF",
    img: "systems/artichron/assets/icons/damage/planar-arcane.svg",
    group: "planar",
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
 * @property {string} img     Filepath to the SVG icon.
 */
export const HEALING = {
  label: "ARTICHRON.HEALING.healing",
  color: "379e00",
  img: "systems/artichron/assets/icons/damage/healing.svg",
};

/* -------------------------------------------------- */

/**
 * @typedef {object} TargetTypeConfig
 * @property {string} label         Displayed label of the targeting type.
 * @property {boolean} isAttached   Is this template type locked to a token during preview?
 * @property {boolean} isArea       Whether this is a target type for individual targets or an area.
 */

/**
 * The types of area targeting, enumerating both configurations for spell areas.
 * @enum {TargetTypeConfig}
 */
export const TARGET_TYPES = {
  self: {
    label: "ARTICHRON.TargetTypes.Self",
    isAttached: false,
    isArea: false,
  },
  single: {
    label: "ARTICHRON.TargetTypes.SingleTarget",
    isAttached: false,
    isArea: false,
  },
  ray: {
    label: "ARTICHRON.TargetTypes.AreaRay",
    isAttached: true,
    isArea: true,
  },
  cone: {
    label: "ARTICHRON.TargetTypes.AreaCone",
    isAttached: true,
    isArea: true,
  },
  circle: {
    label: "ARTICHRON.TargetTypes.AreaCircle",
    isAttached: false,
    isArea: true,
  },
  radius: {
    label: "ARTICHRON.TargetTypes.AreaRadius",
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
 * @type {Record<string, EquipmentCategoryConfig>}
 */
export const EQUIPMENT_CATEGORIES = {
  clothing: {
    label: "ARTICHRON.ITEM.ARMOR.CATEGORIES.clothing",
  },
  natural: {
    label: "ARTICHRON.ITEM.ARMOR.CATEGORIES.natural",
  },
  tech: {
    label: "ARTICHRON.ITEM.ARMOR.CATEGORIES.tech",
  },
};

/* -------------------------------------------------- */

/**
 * @typedef {object} EquipmentTypeConfig
 * @property {number} armorScore      The base defense of a piece of armor in this slot. For tech armor, this value is
 *                                    subtracted from 5 instead.
 * @property {string} defaultImage    Displayed image when a slot is empty.
 * @property {string} label           The human-readable label of this equipment type.
 */

/**
 * Equipment slots.
 * @enum {EquipmentTypeConfig}
 */
export const EQUIPMENT_TYPES = {
  accessory: {
    armorScore: 1,
    defaultImage: "systems/artichron/assets/icons/equipment/accessory.svg",
    label: "ARTICHRON.ITEM.ARMOR.SLOTS.accessory",
  },
  arms: {
    armorScore: 2,
    defaultImage: "systems/artichron/assets/icons/equipment/gauntlet.svg",
    label: "ARTICHRON.ITEM.ARMOR.SLOTS.arms",
  },
  chest: {
    armorScore: 5,
    defaultImage: "systems/artichron/assets/icons/equipment/chest-armor.svg",
    label: "ARTICHRON.ITEM.ARMOR.SLOTS.chest",
  },
  head: {
    armorScore: 3,
    defaultImage: "systems/artichron/assets/icons/equipment/helmet.svg",
    label: "ARTICHRON.ITEM.ARMOR.SLOTS.head",
  },
  legs: {
    armorScore: 4,
    defaultImage: "systems/artichron/assets/icons/equipment/leg-armor.svg",
    label: "ARTICHRON.ITEM.ARMOR.SLOTS.legs",
  },
  boots: {
    armorScore: 2,
    defaultImage: "systems/artichron/assets/icons/equipment/boots.svg",
    label: "ARTICHRON.ITEM.ARMOR.SLOTS.boots",
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
 * @property {string} label         The human-readable label of this item attribute.
 * @property {Set<string>} types    A set of item types this can be an option for. If empty, then all types.
 */

/**
 * Various item attributes.
 * @type {Record<string, ItemAttributeConfig>}
 */
export const ITEM_ATTRIBUTES = {
  pristine: {
    label: "ARTICHRON.ATTRIBUTES.pristine",
    types: new Set(["armor"]),
    transferrable: true,
  },
  mixed: {
    label: "ARTICHRON.ATTRIBUTES.mixed",
    types: new Set(["path"]),
    transferrable: false,
  },
  spellcaster: {
    label: "ARTICHRON.ATTRIBUTES.spellcaster",
    types: new Set(["path"]),
  },
};

/* -------------------------------------------------- */

/**
 * Spell origins.
 * @type {Record<string, string>}
 */
export const SPELL_ORIGINS = {
  elemental: "ARTICHRON.ITEM.SPELL.spellOrigins.elemental",
  planar: "ARTICHRON.ITEM.SPELL.spellOrigins.planar",
  technological: "ARTICHRON.ITEM.SPELL.spellOrigins.technological",
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
    reference: "Compendium.artichron.rules.JournalEntry.xJAQJs1s2SgG9JS0.JournalEntryPage.uVv9k9xheOkxzBhO",
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
    reference: "Compendium.artichron.rules.JournalEntry.xJAQJs1s2SgG9JS0.JournalEntryPage.nIvx3xXwYP9iGSeh",
    group: "leveled",
  },
  burning: {
    name: "ARTICHRON.CONDITIONS.burning",
    img: "systems/artichron/assets/icons/conditions/burning.svg",
    levels: 10,
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.xJAQJs1s2SgG9JS0.JournalEntryPage.3VoSsDfCrBGG8Bzy",
    group: "leveled",
  },
  injured: {
    name: "ARTICHRON.CONDITIONS.injured",
    img: "systems/artichron/assets/icons/conditions/injured.svg",
    levels: 20,
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.xJAQJs1s2SgG9JS0.JournalEntryPage.FRQ8zjWTfTYZWGx3",
    group: "leveled",
  },
  physAtkUp: {
    name: "ARTICHRON.CONDITIONS.physAtkUp",
    img: "systems/artichron/assets/icons/conditions/physical-attack-up.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.xJAQJs1s2SgG9JS0.JournalEntryPage.0iBopTnnWkmkN9kK",
    group: "buff",
  },
  physAtkDown: {
    name: "ARTICHRON.CONDITIONS.physAtkDown",
    img: "systems/artichron/assets/icons/conditions/physical-attack-down.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.xJAQJs1s2SgG9JS0.JournalEntryPage.ZoEO3S8EJCRPu53v",
    group: "buff",
  },
  physDefUp: {
    name: "ARTICHRON.CONDITIONS.physDefUp",
    img: "systems/artichron/assets/icons/conditions/physical-defense-up.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.xJAQJs1s2SgG9JS0.JournalEntryPage.JBjVW6bkIC4DWWw9",
    group: "buff",
  },
  physDefDown: {
    name: "ARTICHRON.CONDITIONS.physDefDown",
    img: "systems/artichron/assets/icons/conditions/physical-defense-down.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.xJAQJs1s2SgG9JS0.JournalEntryPage.k5rl3B6Im0RDUlxF",
    group: "buff",
  },
  elemAtkUp: {
    name: "ARTICHRON.CONDITIONS.elemAtkUp",
    img: "systems/artichron/assets/icons/conditions/elemental-attack-up.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.xJAQJs1s2SgG9JS0.JournalEntryPage.0iBopTnnWkmkN9kK",
    group: "buff",
  },
  elemAtkDown: {
    name: "ARTICHRON.CONDITIONS.elemAtkDown",
    img: "systems/artichron/assets/icons/conditions/elemental-attack-down.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.xJAQJs1s2SgG9JS0.JournalEntryPage.ZoEO3S8EJCRPu53v",
    group: "buff",
  },
  elemDefUp: {
    name: "ARTICHRON.CONDITIONS.elemDefUp",
    img: "systems/artichron/assets/icons/conditions/elemental-defense-up.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.xJAQJs1s2SgG9JS0.JournalEntryPage.JBjVW6bkIC4DWWw9",
    group: "buff",
  },
  elemDefDown: {
    name: "ARTICHRON.CONDITIONS.elemDefDown",
    img: "systems/artichron/assets/icons/conditions/elemental-defense-down.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.xJAQJs1s2SgG9JS0.JournalEntryPage.k5rl3B6Im0RDUlxF",
    group: "buff",
  },
  planAtkUp: {
    name: "ARTICHRON.CONDITIONS.planAtkUp",
    img: "systems/artichron/assets/icons/conditions/planar-attack-up.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.xJAQJs1s2SgG9JS0.JournalEntryPage.0iBopTnnWkmkN9kK",
    group: "buff",
  },
  planAtkDown: {
    name: "ARTICHRON.CONDITIONS.planAtkDown",
    img: "systems/artichron/assets/icons/conditions/planar-attack-down.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.xJAQJs1s2SgG9JS0.JournalEntryPage.ZoEO3S8EJCRPu53v",
    group: "buff",
  },
  planDefUp: {
    name: "ARTICHRON.CONDITIONS.planDefUp",
    img: "systems/artichron/assets/icons/conditions/planar-defense-up.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.xJAQJs1s2SgG9JS0.JournalEntryPage.JBjVW6bkIC4DWWw9",
    group: "buff",
  },
  planDefDown: {
    name: "ARTICHRON.CONDITIONS.planDefDown",
    img: "systems/artichron/assets/icons/conditions/planar-defense-down.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.xJAQJs1s2SgG9JS0.JournalEntryPage.k5rl3B6Im0RDUlxF",
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
 * @typedef CorePathConfiguration
 * @property {string} label     Human-readable label.
 * @property {string} uuid      The uuid to the core path item.
 * @property {number} health    How much health is granted at intervals a hero has this as primary path.
 * @property {Proxy} mixed      Proxy object to retrieve a resulting mixed path.
 */

/** @type {Record<string, CorePathConfiguration>} */
export const PROGRESSION_CORE_PATHS = {
  cleric: {
    label: "ARTICHRON.PROGRESSION.LABELS.cleric",
    uuid: "Compendium.artichron.items.Item.TOPOCY0zrPjEj59G",
    health: 3,
    mixed: {},
  },
  fighter: {
    label: "ARTICHRON.PROGRESSION.LABELS.fighter",
    uuid: "Compendium.artichron.items.Item.UrSG9mEumnMbTIrM",
    health: 4,
    mixed: {},
  },
  mage: {
    label: "ARTICHRON.PROGRESSION.LABELS.mage",
    uuid: "Compendium.artichron.items.Item.7i6uNxcreJWoO4C9",
    health: 2,
    mixed: {},
  },
  rogue: {
    label: "ARTICHRON.PROGRESSION.LABELS.rogue",
    uuid: "Compendium.artichron.items.Item.1LlHcgghhPrbJjIi",
    health: 3,
    mixed: {},
  },
};

/* -------------------------------------------------- */

/**
 * @typedef MixedPathConfiguration
 * @property {string} label     Human-readable label.
 * @property {string} uuid      The uuid to the path item.
 * @property {number} health    How much health is granted at intervals a hero has this as primary path.
 */

/** @type {Record<string, MixedPathConfiguration>} */
export const PROGRESSION_MIXED_PATHS = {
  inquisitor: {
    label: "ARTICHRON.PROGRESSION.LABELS.inquisitor",
    uuid: "Compendium.artichron.items.Item.WuJqNVsC1LKvvPjF",
    health: 3,
  },
  shaman: {
    label: "ARTICHRON.PROGRESSION.LABELS.shaman",
    uuid: "Compendium.artichron.items.Item.SzGVudF2sfodAy9O",
    health: 3,
  },
  spellblade: {
    label: "ARTICHRON.PROGRESSION.LABELS.spellblade",
    uuid: "Compendium.artichron.items.Item.59ScnAaMmCDPtZfe",
    health: 3,
  },
  swashbuckler: {
    label: "ARTICHRON.PROGRESSION.LABELS.swashbuckler",
    uuid: "Compendium.artichron.items.Item.MRLCVc7ewf3y4T91",
    health: 3,
  },
  templar: {
    label: "ARTICHRON.PROGRESSION.LABELS.templar",
    uuid: "Compendium.artichron.items.Item.VzLWOrUWzibGNClQ",
    health: 4,
  },
  warlock: {
    label: "ARTICHRON.PROGRESSION.LABELS.warlock",
    uuid: "Compendium.artichron.items.Item.WJltuDU36z2v0hH1",
    health: 3,
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

/**
 * All progression paths.
 * @type {Record<string, {label: string, uuid: string, health: number}>}
 */
export const PROGRESSION_PATHS = {
  ...PROGRESSION_CORE_PATHS,
  ...PROGRESSION_MIXED_PATHS,
};

export const PROGRESSION_VALUES = {
  relative: {
    lower: 45,
    upper: 55,
  },
  // If any path has more than this, use relative.
  // You also cannot be mixed-path unless meeting this.
  absolute: 8,
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
/*   Recovery                                         */
/* -------------------------------------------------- */

/**
 * Suggested tasks for a recovery phase and their suggested default skill.
 * @type {Record<string, {label: string, skill: string}>}
 */
export const RECOVERY_TASKS = {
  cook: {
    label: "ARTICHRON.RECOVERY.TASK.cook",
    skill: "mind",
  },
  entertain: {
    label: "ARTICHRON.RECOVERY.TASK.entertain",
    skill: "spirit",
  },
  findFood: {
    label: "ARTICHRON.RECOVERY.TASK.findFood",
    skill: "agility",
  },
  keepWatch: {
    label: "ARTICHRON.RECOVERY.TASK.keepWatch",
    skill: "mind",
  },
  makeCamp: {
    label: "ARTICHRON.RECOVERY.TASK.makeCamp",
    skill: "brawn",
  },
  upkeep: {
    label: "ARTICHRON.RECOVERY.TASK.upkeep",
    skill: "agility",
  },
};

/* -------------------------------------------------- */

/**
 * @typedef {object} BasicAttackConfiguration
 * @property {string} label                                     Human-readable label.
 * @property {Record<string, AttackTypeConfiguration>} types    The attack types.
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
 * Level scaling table.
 * @type {Record<number, {number: number, faces: number}>}
 */
export const LEVEL_SCALING = {
  1: { number: 2, faces: 10 },
  10: { number: 1 },
  20: { number: 1 },
  30: { number: 1 },
  40: { number: 1 },
  50: { number: 1 },
};

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
