export const SYSTEM = {};

/**
 * @typedef {object} DamageTypeConfig
 * @property {string} label             Displayed label of the damage type.
 * @property {string} color             Associated default color.
 * @property {string} icon              FA icon used for the damage type.
 * @property {string} group             An optgroup key to put this damage type in for rendering.
 * @property {boolean} [elemental]      ...?
 * @property {boolean} [resist]         Whether this damage type can be resisted.
 * @property {boolean} [armor]          Whether this damage type is resisted by armor rating.
 */

/**
 * Damage types and relevant properties.
 * @enum {DamageTypeConfig}
 */
SYSTEM.DAMAGE_TYPES = {
  fire: {
    label: "ARTICHRON.DamageType.Fire",
    color: "FF5733",
    icon: "fa-solid fa-fire",
    group: "elemental",
    elemental: true,
    resist: true
  },
  wind: {
    label: "ARTICHRON.DamageType.Wind",
    color: "8DEEB5",
    icon: "fa-solid fa-wind",
    group: "elemental",
    elemental: true,
    resist: true
  },
  lightning: {
    label: "ARTICHRON.DamageType.Lightning",
    color: "4B70A8",
    icon: "fa-solid fa-bolt",
    group: "elemental",
    elemental: true,
    resist: true
  },
  ice: {
    label: "ARTICHRON.DamageType.Ice",
    color: "54D7E0",
    icon: "fa-solid fa-snowflake",
    group: "elemental",
    elemental: true,
    resist: true
  },
  light: {
    label: "ARTICHRON.DamageType.Light",
    color: "FCFFBF",
    icon: "fa-solid fa-sun",
    group: "planar",
    resist: true
  },
  darkness: {
    label: "ARTICHRON.DamageType.Darkness",
    color: "910B94",
    icon: "fa-solid fa-moon",
    group: "planar",
    resist: true
  },
  physical: {
    label: "ARTICHRON.DamageType.Physical",
    color: "868686",
    icon: "fa-solid fa-hand-fist",
    group: "physical",
    armor: true
  },
  arcane: {
    label: "ARTICHRON.DamageType.Arcane",
    color: "C79FFF",
    icon: "fa-solid fa-wand-sparkles",
    group: "planar",
    resist: true
  }
};

/* -------------------------------------------------- */

/**
 * @typedef {object} DamageTypeGroupConfig
 * @property {string} label     The human-readable label of this damage group.
 */

/**
 * Damage group types.
 * @enum {DamageTypeGroupConfig}
 */
SYSTEM.DAMAGE_TYPE_GROUPS = {
  physical: {label: "ARTICHRON.DamageTypeGroup.Physical"},
  elemental: {label: "ARTICHRON.DamageTypeGroup.Elemental"},
  planar: {label: "ARTICHRON.DamageTypeGroup.Planar"}
};

/* -------------------------------------------------- */

/**
 * @typedef {object} AreaTargetTypes
 * @property {string} label             Displayed label of the targeting type.
 * @property {Set<string>} scale        The properties that can scale with mana.
 * @property {string} modifier          The die modifier to attach to this damage roll.
 * @property {boolean} [ammo]           Whether this is a valid area type for ammo.
 * @property {number[]} [count]         The default count and how much each increase is.
 * @property {number[]} [range]         The default range and how much each increase is.
 * @property {number[]} [distance]      The default distance and how much each increase is.
 * @property {number[]} [width]         The default width and how much each increase is.
 * @property {number[]} [radius]        The default radius and how much each increase is.
 */

/**
 * The types of area targeting, enumerating both configurations for spell areas and upscaling
 * with mana, as well as what blast zones a piece of ammo can create.
 * @enum {AreaTargetTypes}
 */
SYSTEM.AREA_TARGET_TYPES = {
  single: {
    label: "ARTICHRON.SpellShape.SingleTarget",
    scale: new Set(["count", "range"]),
    modifier: "x",
    count: [1, 1],
    range: [6, 2]
  },
  ray: {
    label: "ARTICHRON.SpellShape.AreaRay",
    scale: new Set(["count", "distance", "width"]),
    modifier: "xo",
    ammo: true,
    count: [1, 1],
    distance: [4, 2],
    width: [1, 1]
  },
  cone: {
    label: "ARTICHRON.SpellShape.AreaCone",
    scale: new Set(["count", "distance"]),
    modifier: "min2",
    ammo: true,
    count: [1, 1],
    distance: [3, 2]
  },
  circle: {
    label: "ARTICHRON.SpellShape.AreaCircle",
    scale: new Set(["count", "radius", "range"]),
    modifier: "",
    ammo: true,
    count: [1, 1],
    radius: [1, 1],
    range: [5, 2]
  },
  radius: {
    label: "ARTICHRON.SpellShape.AreaRadius",
    scale: new Set(["radius"]),
    modifier: "rr",
    radius: [2, 1]
  }
};

/* -------------------------------------------------- */

/**
 * @typedef {object} WeaponTypeConfig
 * @property {string} label     The human-readable label of this weapon type.
 */

/**
 * Weapon subtypes.
 * @enum {WeaponTypeConfig}
 */
SYSTEM.WEAPON_TYPES = {
  axe: {label: "ARTICHRON.WeaponType.Axe"},
  bow: {label: "ARTICHRON.WeaponType.Bow"},
  chakram: {label: "ARTICHRON.WeaponType.Chakram"},
  dagger: {label: "ARTICHRON.WeaponType.Dagger"},
  hammer: {label: "ARTICHRON.WeaponType.Hammer"},
  meteorHammer: {label: "ARTICHRON.WeaponType.MeteorHammer"},
  nunChuck: {label: "ARTICHRON.WeaponType.NunChuck"},
  pistol: {label: "ARTICHRON.WeaponType.Pistol"},
  rifle: {label: "ARTICHRON.WeaponType.Rifle"},
  shotgun: {label: "ARTICHRON.WeaponType.Shotgun"},
  spear: {label: "ARTICHRON.WeaponType.Spear"},
  sword: {label: "ARTICHRON.WeaponType.Sword"}
};

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
SYSTEM.SHIELD_TYPES = {
  buckler: {
    label: "ARTICHRON.ShieldType.Buckler",
    width: 1
  },
  heater: {
    label: "ARTICHRON.ShieldType.Heater",
    width: 2
  },
  kite: {
    label: "ARTICHRON.ShieldType.Kite",
    width: 3
  },
  tower: {
    label: "ARTICHRON.ShieldType.Tower",
    width: 4
  }
};

/* -------------------------------------------------- */

/**
 * @typedef {object} SpellTypeConfig
 * @property {string} label     The human-readable label of this spell type.
 */

/**
 * Spell subtypes.
 * @enum {SpellTypeConfig}
 */
SYSTEM.SPELL_TYPES = {
  offense: {label: "ARTICHRON.SpellType.Offense"},
  defense: {label: "ARTICHRON.SpellType.Defense"},
  buff: {label: "ARTICHRON.SpellType.Buff"}
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
SYSTEM.EQUIPMENT_TYPES = {
  accessory: {label: "ARTICHRON.ArmorType.Accessory"},
  arms: {label: "ARTICHRON.ArmorType.Arms"},
  chest: {label: "ARTICHRON.ArmorType.Chest"},
  head: {label: "ARTICHRON.ArmorType.Head"},
  legs: {label: "ARTICHRON.ArmorType.Legs"},
  boots: {label: "ARTICHRON.ArmorType.Boots"}
};

/* -------------------------------------------------- */

/**
 * @typedef {object} ElixirTypeConfig
 * @property {string} label     The human-readable label of this elixir type.
 */

/**
 * Elixir subtypes.
 * @enum {ElixirTypeConfig}
 */
SYSTEM.ELIXIR_TYPES = {
  booster: {
    label: "ARTICHRON.ElixirType.Booster"
  },
  buff: {
    label: "ARTICHRON.ElixirType.Buff"
  },
  restorative: {
    label: "ARTICHRON.ElixirType.Restorative"
  }
};

/* -------------------------------------------------- */

/**
 * @typedef {object} AmmunitionTypeConfig
 * @property {string} label             The human-readable label of this ammunition type.
 * @property {Set<string>} weapons      The weapon subtypes that can use this ammo.
 */

/**
 * Ammunition subtypes.
 * @enum {AmmunitionTypeConfig}
 */
SYSTEM.AMMUNITION_TYPES = {
  arrow: {
    label: "ARTICHRON.AmmunitionType.Arrow",
    weapons: new Set(["bow"])
  },
  bullet: {
    label: "ARTICHRON.AmmunitionType.Bullet",
    weapons: new Set(["pistol"])
  },
  round: {
    label: "ARTICHRON.AmmunitionType.Round",
    weapons: new Set(["rifle"])
  },
  shell: {
    label: "ARTICHRON.AmmunitionType.Shell",
    weapons: new Set(["shotgun"])
  }
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
SYSTEM.PART_TYPES = {};

/* -------------------------------------------------- */

/**
 * @typedef {object} EffectDurationConfig
 * @property {string} label     The human-readable label of this effect duration type.
 */

/**
 * Effect duration types.
 * @enum {EffectDurationConfig}
 */
SYSTEM.EFFECT_EXPIRATION_TYPES = {
  none: {label: "ARTICHRON.EffectProperty.ExpirationNone"},
  combat: {label: "ARTICHRON.EffectProperty.ExpirationCombat"},
  day: {label: "ARTICHRON.EffectProperty.ExpirationDay"}
};

/* -------------------------------------------------- */

/**
 * @typedef {object} ItemAttributeConfig
 * @property {string} label             The human-readable label of this item attribute.
 * @property {Set<string>} [types]      A set of item types this can be an option for. If empty or omitted, then all types.
 */

/**
 * Various item attributes.
 * @enum {ItemAttributeConfig}
 */
SYSTEM.ITEM_ATTRIBUTES = {
  ammunition: {
    label: "ARTICHRON.ItemAttribute.Ammunition",
    types: new Set(["weapon"])
  },
  blocking: {
    label: "ARTICHRON.ItemAttribute.Blocking",
    types: new Set(["weapon", "shield", "spell"])
  },
  bludgeoning: {
    label: "ARTICHRON.ItemAttribute.Bludgeoning",
    types: new Set(["weapon"])
  },
  magical: {
    label: "ARTICHRON.ItemAttribute.Magical"
  },
  parrying: {
    label: "ARTICHRON.ItemAttribute.Parrying",
    types: new Set(["weapon", "shield", "spell"])
  },
  rending: {
    label: "ARTICHRON.ItemAttribute.Rending",
    types: new Set(["weapon", "shield", "spell"])
  }
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
SYSTEM.STATUS_CONDITIONS = {
  defeated: {
    name: "ARTICHRON.StatusConditions.Defeated",
    img: "icons/svg/skull.svg",
    hud: true
  },
  blind: {
    name: "ARTICHRON.StatusConditions.Blind",
    img: "icons/svg/blind.svg",
    hud: true
  },
  hindered: {
    name: "ARTICHRON.StatusConditions.Hindered",
    img: "icons/svg/stoned.svg",
    levels: 10,
    hud: true,
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.uVv9k9xheOkxzBhO"
  },
  invisible: {
    name: "ARTICHRON.StatusConditions.Invisible",
    img: "icons/svg/invisible.svg",
    hud: true
  },
  underground: {
    name: "ARTICHRON.StatusConditions.Underground",
    img: "icons/svg/mole.svg",
    hud: true
  },
  flying: {
    name: "ARTICHRON.StatusConditions.Flying",
    img: "icons/svg/wing.svg",
    hud: true
  },
  levitating: {
    name: "ARTICHRON.StatusConditions.Levitating",
    img: "icons/svg/wingfoot.svg",
    hud: true
  },
  bleeding: {
    name: "ARTICHRON.StatusConditions.Bleeding",
    img: "icons/svg/blood.svg",
    levels: 10,
    hud: true,
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.nIvx3xXwYP9iGSeh"
  },
  burning: {
    name: "ARTICHRON.StatusConditions.Burning",
    img: "icons/svg/fire.svg",
    levels: 10,
    hud: true,
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.3VoSsDfCrBGG8Bzy"
  },
  injured: {
    name: "ARTICHRON.StatusConditions.Injured",
    img: "icons/svg/bones.svg",
    levels: 100,
    hud: true,
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.FRQ8zjWTfTYZWGx3"
  }
};

/* -------------------------------------------------- */

/**
 * @typedef {object} SkillConfig
 * @property {string} label     The displayed label of the skill.
 * @property {string} group     The skill group this belongs to (mind, body, soul).
 */

/**
 * The skills available.
 * @enum {SkillConfig}
 */
SYSTEM.SKILLS = {
  avoidDetection: {
    label: "ARTICHRON.Skill.AvoidDetection",
    group: "soul"
  },
  bamboozle: {
    label: "ARTICHRON.Skill.Bamboozle",
    group: "soul"
  },
  barter: {
    label: "ARTICHRON.Skill.Barter",
    group: "soul"
  },
  charm: {
    label: "ARTICHRON.Skill.Charm",
    group: "soul"
  },
  examine: {
    label: "ARTICHRON.Skill.Examine",
    group: "mind"
  },
  findPath: {
    label: "ARTICHRON.Skill.FindPath",
    group: "mind"
  },
  heartiness: {
    label: "ARTICHRON.Skill.Heartiness",
    group: "body"
  },
  knowledgeHistory: {
    label: "ARTICHRON.Skill.KnowledgeHistory",
    group: "mind"
  },
  knowledgeMagic: {
    label: "ARTICHRON.Skill.KnowledgeMagic",
    group: "mind"
  },
  knowledgeReligion: {
    label: "ARTICHRON.Skill.KnowledgeReligion",
    group: "mind"
  },
  knowledgeScience: {
    label: "ARTICHRON.Skill.KnowledgeScience",
    group: "mind"
  },
  knowledgeTech: {
    label: "ARTICHRON.Skill.KnowledgeTech",
    group: "mind"
  },
  liftThrow: {
    label: "ARTICHRON.Skill.LiftThrow",
    group: "body"
  },
  menace: {
    label: "ARTICHRON.Skill.Menace",
    group: "soul"
  },
  movement: {
    label: "ARTICHRON.Skill.Movement",
    group: "body"
  },
  pickpocket: {
    label: "ARTICHRON.Skill.Pickpocket",
    group: "body"
  },
  poisonResistance: {
    label: "ARTICHRON.Skill.PoisonResistance",
    group: "body"
  },
  reason: {
    label: "ARTICHRON.Skill.Reason",
    group: "mind"
  },
  research: {
    label: "ARTICHRON.Skill.Research",
    group: "mind"
  },
  trapAvoidance: {
    label: "ARTICHRON.Skill.TrapAvoidance",
    group: "body"
  },
  understanding: {
    label: "ARTICHRON.Skill.Understanding",
    group: "soul"
  },
  wardDetection: {
    label: "ARTICHRON.Skill.WardDetection",
    group: "mind"
  }
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
SYSTEM.POOL_SIZE_SPECIALIZATION_TYPES = {
  balanced: {
    label: "ARTICHRON.PoolConfig.SpecializationBalanced",
    hint: "ARTICHRON.PoolConfig.SpecializationBalancedSizeHint",
    sizes: [4, 4, 4]
  },
  specialized: {
    label: "ARTICHRON.PoolConfig.SpecializationSpecialized",
    hint: "ARTICHRON.PoolConfig.SpecializationSpecializedSizeHint",
    sizes: [2, 4, 6]
  },
  focused: {
    label: "ARTICHRON.PoolConfig.SpecializationFocused",
    hint: "ARTICHRON.PoolConfig.SpecializationFocusedSizeHint",
    sizes: [2, 2, 8]
  }
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
SYSTEM.POOL_FACES_SPECIALIZATION_TYPES = {
  balanced: {
    label: "ARTICHRON.PoolConfig.SpecializationBalanced",
    hint: "ARTICHRON.PoolConfig.SpecializationBalancedFacesHint",
    faces: [6, 6, 6]
  },
  specialized: {
    label: "ARTICHRON.PoolConfig.SpecializationSpecialized",
    hint: "ARTICHRON.PoolConfig.SpecializationSpecializedFacesHint",
    faces: [4, 6, 8]
  },
  focused: {
    label: "ARTICHRON.PoolConfig.SpecializationFocused",
    hint: "ARTICHRON.PoolConfig.SpecializationFocusedFacesHint",
    faces: [4, 4, 10]
  }
};
