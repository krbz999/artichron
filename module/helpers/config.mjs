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
 * @typedef {object} ShieldTypeConfig
 * @property {string} label     The human-readable label of this shield type.
 * @property {number} width     The relative size of a shield of this type.
 */

/**
 * Shield subtypes.
 * @enum {ShieldTypeConfig}
 */
export const SHIELD_TYPES = {
  buckler: {
    label: "ARTICHRON.ShieldType.Buckler",
    width: 1,
  },
  heater: {
    label: "ARTICHRON.ShieldType.Heater",
    width: 2,
  },
  kite: {
    label: "ARTICHRON.ShieldType.Kite",
    width: 3,
  },
  tower: {
    label: "ARTICHRON.ShieldType.Tower",
    width: 4,
  },
};

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
  accessory: { label: "ARTICHRON.ArmorType.Accessory" },
  arms: { label: "ARTICHRON.ArmorType.Arms" },
  chest: { label: "ARTICHRON.ArmorType.Chest" },
  head: { label: "ARTICHRON.ArmorType.Head" },
  legs: { label: "ARTICHRON.ArmorType.Legs" },
  boots: { label: "ARTICHRON.ArmorType.Boots" },
};

/* -------------------------------------------------- */

/**
 * @typedef {object} AmmunitionTypeConfig
 * @property {string} label     The human-readable label of this ammunition type.
 */

/**
 * Ammunition subtypes.
 * @enum {AmmunitionTypeConfig}
 */
export const AMMUNITION_TYPES = {
  arrow: {
    label: "ARTICHRON.AmmunitionType.Arrow",
  },
  bullet: {
    label: "ARTICHRON.AmmunitionType.Bullet",
  },
  round: {
    label: "ARTICHRON.AmmunitionType.Round",
  },
  shell: {
    label: "ARTICHRON.AmmunitionType.Shell",
  },
};

/* -------------------------------------------------- */

/**
 * @typedef {object} PartTypeConfig
 * @property {string} label     The human-readable label of this monster part type.
 */

/**
 * Monster part subtypes.
 * @enum {PartTypeConfig}
 */
export const PART_TYPES = {
  horn: {
    label: "placeholder",
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
 * @property {string} label                 The human-readable label of this item attribute.
 * @property {Set<string>} [types]          A set of item types this can be an option for.
 *                                          If empty or omitted, then all types.
 * @property {boolean} [transferrable]      If explicitly false, this attribute will not be
 *                                          transferred automatically via fusions.
 * @property {string} [status]              What status is applied if taking damage from an item with this attribute?
 * @property {boolean} [damageOption]       Is this configurable per damage part on an arsenal item?
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
  // blocking: {
  //   label: "ARTICHRON.ItemAttribute.Blocking",
  //   types: new Set(["spell"]),
  //   transferrable: true,
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
    damageOption: false,
  },
  irreducible: {
    label: "ARTICHRON.ATTRIBUTES.irreducible",
    types: new Set(["spell"]),
    transferrable: true,
    damageOption: true,
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
  twoHanded: {
    label: "ARTICHRON.ATTRIBUTES.twoHanded",
    types: new Set(["spell"]),
    transferrable: true,
    damageOption: false,
  },
  // undefendable: {
  //   label: "ARTICHRON.ItemAttribute.Undefendable",
  //   types: new Set(["spell"]),
  //   transferrable: true,
  //   damageOption: true,
  // },
};

/* -------------------------------------------------- */

/**
 * @typedef {object} StatusConditionConfig
 * @property {string} name          The displayed name of the condition.
 * @property {string} img           The displayed image of the condition.
 * @property {number} [levels]      The amount of stacking levels of the condition.
 * @property {boolean} hud          Whether this appears on the token hud.
 * @property {string} reference     The uuid of a journal entry page that contains the details of this condition.
 */

/**
 * The status conditions available.
 * @enum {StatusConditionConfig}
 */
export const STATUS_CONDITIONS = {
  defeated: {
    name: "ARTICHRON.CONDITIONS.FIELDS.defeated.label",
    img: "systems/artichron/assets/icons/defeated.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "TODO",
  },
  blind: {
    name: "ARTICHRON.CONDITIONS.FIELDS.blind.label",
    img: "systems/artichron/assets/icons/blind.svg",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "TODO",
  },
  bloodied: {
    name: "ARTICHRON.CONDITIONS.FIELDS.bloodied.label",
    img: "systems/artichron/assets/icons/bloodied.svg",
    hud: false,
    reference: "TODO",
  },
  critical: {
    name: "ARTICHRON.CONDITIONS.FIELDS.critical.label",
    img: "systems/artichron/assets/icons/critical.svg",
    hud: false,
    reference: "TODO",
  },
  hindered: {
    name: "ARTICHRON.CONDITIONS.FIELDS.hindered.label",
    img: "systems/artichron/assets/icons/hindered.svg",
    levels: 10,
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.uVv9k9xheOkxzBhO",
  },
  invisible: {
    name: "ARTICHRON.CONDITIONS.FIELDS.invisible.label",
    img: "systems/artichron/assets/icons/invisible.svg",
    hud: true,
    reference: "TODO",
  },
  underground: {
    name: "ARTICHRON.CONDITIONS.FIELDS.underground.label",
    img: "icons/svg/mole.svg",
    hud: true,
    reference: "TODO",
  },
  flying: {
    name: "ARTICHRON.CONDITIONS.FIELDS.flying.label",
    img: "systems/artichron/assets/icons/flying.svg",
    hud: true,
    reference: "TODO",
  },
  levitating: {
    name: "ARTICHRON.CONDITIONS.FIELDS.levitating.label",
    img: "icons/svg/wingfoot.svg",
    hud: true,
    reference: "TODO",
  },
  bleeding: {
    name: "ARTICHRON.CONDITIONS.FIELDS.bleeding.label",
    img: "systems/artichron/assets/icons/bleeding.svg",
    levels: 10,
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.nIvx3xXwYP9iGSeh",
  },
  burning: {
    name: "ARTICHRON.CONDITIONS.FIELDS.burning.label",
    img: "systems/artichron/assets/icons/burning.svg",
    levels: 10,
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.3VoSsDfCrBGG8Bzy",
  },
  injured: {
    name: "ARTICHRON.CONDITIONS.FIELDS.injured.label",
    img: "systems/artichron/assets/icons/injured.svg",
    levels: 20,
    hud: { actorTypes: ["hero", "monster"] },
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.FRQ8zjWTfTYZWGx3",
  },
  physAtkUp: {
    name: "ARTICHRON.CONDITIONS.FIELDS.physAtkUp.label",
    img: "icons/equipment/shield/buckler-wooden-triangle-brown.webp",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "TODO",
  },
  physAtkDown: {
    name: "ARTICHRON.CONDITIONS.FIELDS.physAtkDown.label",
    img: "icons/equipment/shield/buckler-wooden-triangle-brown.webp",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "TODO",
  },
  physDefUp: {
    name: "ARTICHRON.CONDITIONS.FIELDS.physDefUp.label",
    img: "icons/equipment/shield/buckler-wooden-triangle-brown.webp",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "TODO",
  },
  physDefDown: {
    name: "ARTICHRON.CONDITIONS.FIELDS.physDefDown.label",
    img: "icons/equipment/shield/buckler-wooden-triangle-brown.webp",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "TODO",
  },
  elemAtkUp: {
    name: "ARTICHRON.CONDITIONS.FIELDS.elemAtkUp.label",
    img: "icons/equipment/shield/buckler-wooden-triangle-brown.webp",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "TODO",
  },
  elemAtkDown: {
    name: "ARTICHRON.CONDITIONS.FIELDS.elemAtkDown.label",
    img: "icons/equipment/shield/buckler-wooden-triangle-brown.webp",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "TODO",
  },
  elemDefUp: {
    name: "ARTICHRON.CONDITIONS.FIELDS.elemDefUp.label",
    img: "icons/equipment/shield/buckler-wooden-triangle-brown.webp",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "TODO",
  },
  elemDefDown: {
    name: "ARTICHRON.CONDITIONS.FIELDS.elemDefDOwn.label",
    img: "icons/equipment/shield/buckler-wooden-triangle-brown.webp",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "TODO",
  },
  planAtkUp: {
    name: "ARTICHRON.CONDITIONS.FIELDS.planAtkUp.label",
    img: "icons/equipment/shield/buckler-wooden-triangle-brown.webp",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "TODO",
  },
  planAtkDown: {
    name: "ARTICHRON.CONDITIONS.FIELDS.planAtkDown.label",
    img: "icons/equipment/shield/buckler-wooden-triangle-brown.webp",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "TODO",
  },
  planDefUp: {
    name: "ARTICHRON.CONDITIONS.FIELDS.planDefUp.label",
    img: "icons/equipment/shield/buckler-wooden-triangle-brown.webp",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "TODO",
  },
  planDefDown: {
    name: "ARTICHRON.CONDITIONS.FIELDS.planDefDown.label",
    img: "icons/equipment/shield/buckler-wooden-triangle-brown.webp",
    hud: { actorTypes: ["hero", "monster"] },
    reference: "TODO",
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
 * @enum {SkillConfig}
 */
export const SKILLS = {
  agility: {
    label: "ARTICHRON.SKILL.agility",
    img: "icons/skills/movement/feet-winged-boots-blue.webp",
  },
  brawn: {
    label: "ARTICHRON.SKILL.brawn",
    img: "icons/skills/melee/unarmed-punch-fist-white.webp",
  },
  mind: {
    label: "ARTICHRON.SKILL.mind",
    img: "icons/magic/symbols/star-solid-gold.webp",
  },
  spirit: {
    label: "ARTICHRON.SKILL.spirit",
    img: "icons/magic/symbols/star-rising-purple.webp",
  },
};

/* -------------------------------------------------- */

/**
 * @typedef {object} PoolConfig
 * @property {string} label       The displayed label of the pool.
 * @property {boolean} boost      When using this pool, can it be boosted by an elixir?
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
 * @typedef {object} PoolSizeSpecializationConfig
 * @property {string} label       The displayed label of this type of pool size specialization.
 * @property {number[]} sizes     The distribution of sizes assigned to the pools.
 */

/**
 * The options for how to distribute the configuration of pool sizes.
 * @enum {PoolSizeSpecializationConfig}
 */
export const POOL_SIZE_SPECIALIZATION_TYPES = {
  balanced: {
    label: "ARTICHRON.PoolConfig.SpecializationBalanced",
    hint: "ARTICHRON.PoolConfig.SpecializationBalancedSizeHint",
    sizes: [4, 4, 4],
  },
  specialized: {
    label: "ARTICHRON.PoolConfig.SpecializationSpecialized",
    hint: "ARTICHRON.PoolConfig.SpecializationSpecializedSizeHint",
    sizes: [2, 4, 6],
  },
  focused: {
    label: "ARTICHRON.PoolConfig.SpecializationFocused",
    hint: "ARTICHRON.PoolConfig.SpecializationFocusedSizeHint",
    sizes: [2, 2, 8],
  },
};

/* -------------------------------------------------- */

/**
 * @typedef {object} PoolFacesSpecializationConfig
 * @property {string} label       The displayed label of this type of pool size specialization.
 * @property {number[]} faces     The distribution of faces assigned to the pools.
 */

/**
 * The options for how to distribute the configuration of pool faces.
 * @enum {PoolFacesSpecializationConfig}
 */
export const POOL_FACES_SPECIALIZATION_TYPES = {
  balanced: {
    label: "ARTICHRON.PoolConfig.SpecializationBalanced",
    hint: "ARTICHRON.PoolConfig.SpecializationBalancedFacesHint",
    faces: [6, 6, 6],
  },
  specialized: {
    label: "ARTICHRON.PoolConfig.SpecializationSpecialized",
    hint: "ARTICHRON.PoolConfig.SpecializationSpecializedFacesHint",
    faces: [4, 6, 8],
  },
  focused: {
    label: "ARTICHRON.PoolConfig.SpecializationFocused",
    hint: "ARTICHRON.PoolConfig.SpecializationFocusedFacesHint",
    faces: [4, 4, 10],
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
