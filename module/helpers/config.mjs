export const SYSTEM = {};

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
SYSTEM.DAMAGE_TYPES = {
  fire: {
    label: "ARTICHRON.DamageType.Fire",
    color: "FF5733",
    icon: "fa-solid fa-fire",
    group: "elemental",
    resist: true
  },
  wind: {
    label: "ARTICHRON.DamageType.Wind",
    color: "8DEEB5",
    icon: "fa-solid fa-wind",
    group: "elemental",
    resist: true
  },
  lightning: {
    label: "ARTICHRON.DamageType.Lightning",
    color: "4B70A8",
    icon: "fa-solid fa-bolt",
    group: "elemental",
    resist: true
  },
  ice: {
    label: "ARTICHRON.DamageType.Ice",
    color: "54D7E0",
    icon: "fa-solid fa-snowflake",
    group: "elemental",
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

Object.defineProperty(SYSTEM.DAMAGE_TYPES, "optgroups", {
  get: function() {
    const groups = Object.entries(CONFIG.SYSTEM.DAMAGE_TYPE_GROUPS).map(([k, {label}]) => {
      const arr = [];
      for (const [u, v] of Object.entries(this)) {
        if (v.group === k) arr.push({value: u, label: v.label, group: label});
      }
      return arr;
    });

    return groups.flat();
  }
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
SYSTEM.DAMAGE_TYPE_GROUPS = {
  physical: {label: "ARTICHRON.DamageTypeGroup.Physical"},
  elemental: {label: "ARTICHRON.DamageTypeGroup.Elemental"},
  planar: {label: "ARTICHRON.DamageTypeGroup.Planar"}
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
SYSTEM.TARGET_TYPES = {
  self: {
    label: "ARTICHRON.TargetTypes.Self",
    scale: new Set(),
    isAttached: false,
    isArea: false
  },
  single: {
    label: "ARTICHRON.TargetTypes.SingleTarget",
    scale: new Set(["count", "range"]),
    isAttached: false,
    isArea: false
  },
  ray: {
    label: "ARTICHRON.TargetTypes.AreaRay",
    scale: new Set(["count", "size", "width"]),
    isAttached: true,
    isArea: true
  },
  cone: {
    label: "ARTICHRON.TargetTypes.AreaCone",
    scale: new Set(["count", "size"]),
    isAttached: true,
    isArea: true
  },
  circle: {
    label: "ARTICHRON.TargetTypes.AreaCircle",
    scale: new Set(["count", "size", "range"]),
    isAttached: false,
    isArea: true
  },
  radius: {
    label: "ARTICHRON.TargetTypes.AreaRadius",
    scale: new Set(["size"]),
    isAttached: true,
    isArea: true
  }
};

Object.defineProperty(SYSTEM.TARGET_TYPES, "optgroups", {
  get: function() {
    const {self, single, ...rest} = this;
    const options = [];
    options.push(
      {value: "self", label: self.label},
      {value: "single", label: single.label}
    );
    const grp = game.i18n.localize("ARTICHRON.TargetTypes.AreaOfEffect");
    options.push(...Object.entries(rest).map(([k, v]) => ({value: k, label: v.label, group: grp})));
    return options;
  }
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
 * @typedef {object} ArsenalWieldingConfig
 * @property {string} label     The human-readable label of this type of wielding.
 */

/**
 * Ways in which to wield an arsenal item.
 * @enum {ArsenalWieldingConfig}
 */
SYSTEM.WIELDING_TYPES = {
  1: {
    label: "ARTICHRON.Wielding.OneHanded"
  },
  2: {
    label: "ARTICHRON.Wielding.TwoHanded"
  }
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
 * @typedef {object} AmmunitionTypeConfig
 * @property {string} label     The human-readable label of this ammunition type.
 */

/**
 * Ammunition subtypes.
 * @enum {AmmunitionTypeConfig}
 */
SYSTEM.AMMUNITION_TYPES = {
  arrow: {
    label: "ARTICHRON.AmmunitionType.Arrow"
  },
  bullet: {
    label: "ARTICHRON.AmmunitionType.Bullet"
  },
  round: {
    label: "ARTICHRON.AmmunitionType.Round"
  },
  shell: {
    label: "ARTICHRON.AmmunitionType.Shell"
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
SYSTEM.PART_TYPES = {
  horn: {
    label: "placeholder"
  }
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
SYSTEM.EFFECT_EXPIRATION_TYPES = {
  none: {label: "ARTICHRON.EffectDurations.None"},
  combat: {label: "ARTICHRON.EffectDurations.Combat"},
  day: {label: "ARTICHRON.EffectDurations.Day"}
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
SYSTEM.TEMPLATE_DURATIONS = {
  none: {
    label: "ARTICHRON.TemplateDurations.None"
  },
  combat: {
    label: "ARTICHRON.TemplateDurations.Combat"
  },
  round: {
    label: "ARTICHRON.TemplateDurations.Round"
  },
  turn: {
    label: "ARTICHRON.TemplateDurations.Turn"
  }
};

/* -------------------------------------------------- */

/**
 * @typedef {object} ItemAttributeConfig
 * @property {string} label                 The human-readable label of this item attribute.
 * @property {Set<string>} [types]          A set of item types this can be an option for.
 *                                          If empty or omitted, then all types.
 * @property {boolean} [transferrable]      If explicitly false, this attribute will not be
 *                                          transferred automatically via fusions.
 */

/**
 * Various item attributes.
 * @enum {ItemAttributeConfig}
 */
SYSTEM.ITEM_ATTRIBUTES = {
  ammunition: {
    label: "ARTICHRON.ItemAttribute.Ammunition",
    types: new Set(["weapon"]),
    transferrable: false
  },
  blocking: {
    label: "ARTICHRON.ItemAttribute.Blocking",
    types: new Set(["weapon", "shield", "spell"]),
    transferrable: true
  },
  bludgeoning: {
    label: "ARTICHRON.ItemAttribute.Bludgeoning",
    types: new Set(["weapon"]),
    transferrable: true
  },
  fusion: {
    label: "ARTICHRON.ItemAttribute.Fusion",
    types: new Set(["weapon", "shield", "spell", "armor"]),
    transferrable: false
  },
  magical: {
    label: "ARTICHRON.ItemAttribute.Magical",
    transferrable: true
  },
  parrying: {
    label: "ARTICHRON.ItemAttribute.Parrying",
    types: new Set(["weapon", "shield", "spell"]),
    transferrable: true
  },
  rending: {
    label: "ARTICHRON.ItemAttribute.Rending",
    types: new Set(["weapon", "shield", "spell"]),
    transferrable: true
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
    img: "systems/artichron/assets/icons/defeated.svg",
    hud: true
  },
  blind: {
    name: "ARTICHRON.StatusConditions.Blind",
    img: "systems/artichron/assets/icons/blind.svg",
    hud: true
  },
  bloodied: {
    name: "ARTICHRON.StatusConditions.Bloodied",
    img: "systems/artichron/assets/icons/bloodied.svg",
    hud: false
  },
  critical: {
    name: "ARTICHRON.StatusConditions.Critical",
    img: "systems/artichron/assets/icons/critical.svg",
    hud: false
  },
  hindered: {
    name: "ARTICHRON.StatusConditions.Hindered",
    img: "systems/artichron/assets/icons/hindered.svg",
    levels: 10,
    hud: true,
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.uVv9k9xheOkxzBhO"
  },
  invisible: {
    name: "ARTICHRON.StatusConditions.Invisible",
    img: "systems/artichron/assets/icons/invisible.svg",
    hud: true
  },
  underground: {
    name: "ARTICHRON.StatusConditions.Underground",
    img: "icons/svg/mole.svg",
    hud: true
  },
  flying: {
    name: "ARTICHRON.StatusConditions.Flying",
    img: "systems/artichron/assets/icons/flying.svg",
    hud: true
  },
  levitating: {
    name: "ARTICHRON.StatusConditions.Levitating",
    img: "icons/svg/wingfoot.svg",
    hud: true
  },
  bleeding: {
    name: "ARTICHRON.StatusConditions.Bleeding",
    img: "systems/artichron/assets/icons/bleeding.svg",
    levels: 10,
    hud: true,
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.nIvx3xXwYP9iGSeh"
  },
  burning: {
    name: "ARTICHRON.StatusConditions.Burning",
    img: "systems/artichron/assets/icons/burning.svg",
    levels: 10,
    hud: true,
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.3VoSsDfCrBGG8Bzy"
  },
  injured: {
    name: "ARTICHRON.StatusConditions.Injured",
    img: "systems/artichron/assets/icons/injured.svg",
    levels: 20,
    hud: true,
    reference: "Compendium.artichron.rules.JournalEntry.JjiZqfbpC2YVXV4R.JournalEntryPage.FRQ8zjWTfTYZWGx3"
  }
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
SYSTEM.SKILLS = {
  agility: {
    label: "ARTICHRON.Skills.Agility",
    img: "icons/skills/movement/feet-winged-boots-blue.webp"
  },
  brawn: {
    label: "ARTICHRON.Skills.Brawn",
    img: "icons/skills/melee/unarmed-punch-fist-white.webp"
  },
  mind: {
    label: "ARTICHRON.Skills.Mind",
    img: "icons/magic/symbols/star-solid-gold.webp"
  },
  spirit: {
    label: "ARTICHRON.Skills.Spirit",
    img: "icons/magic/symbols/star-rising-purple.webp"
  }
};

/* -------------------------------------------------- */

/**
 * @typedef {object} PoolConfig
 * @property {string} label     The displayed label of the pool.
 */

/**
 * The pools used by a character.
 * @enum {PoolConfig}
 */
SYSTEM.POOL_TYPES = {
  health: {
    label: "ARTICHRON.Pools.Health"
  },
  stamina: {
    label: "ARTICHRON.Pools.Stamina"
  },
  mana: {
    label: "ARTICHRON.Pools.Mana"
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
SYSTEM.PROGRESSION_THRESHOLDS = [{
  label: "ARTICHRON.PROGRESSION.THRESHOLDS.Novice",
  level: 1,
  threshold: 0
}, {
  label: "ARTICHRON.PROGRESSION.THRESHOLDS.Experienced",
  level: 2,
  threshold: 20
}, {
  label: "ARTICHRON.PROGRESSION.THRESHOLDS.Veteran",
  level: 3,
  threshold: 50
}];

/* -------------------------------------------------- */

SYSTEM.PROGRESSION_CORE_PATHS = {
  cleric: {
    label: "ARTICHRON.PROGRESSION.PATHS.Cleric"
  },
  fighter: {
    label: "ARTICHRON.PROGRESSION.PATHS.Fighter"
  },
  mage: {
    label: "ARTICHRON.PROGRESSION.PATHS.Mage"
  },
  thief: {
    label: "ARTICHRON.PROGRESSION.PATHS.Thief"
  }
};

SYSTEM.PROGRESSION_MIXED_PATHS = {
  paladin: {
    label: "ARTICHRON.PROGRESSION.PATHS.Paladin",
    combo: new Set(["fighter", "cleric"])
  },
  shaman: {
    label: "ARTICHRON.PROGRESSION.PATHS.Shaman",
    combo: new Set(["cleric", "mage"])
  },
  spellblade: {
    label: "ARTICHRON.PROGRESSION.PATHS.Spellblade",
    combo: new Set(["fighter", "mage"])
  },
  trickster: {
    label: "ARTICHRON.PROGRESSION.PATHS.Trickster",
    combo: new Set(["mage", "thief"])
  },
  TODO1: {
    label: "???",
    combo: new Set(["cleric", "thief"])
  },
  TODO2: {
    label: "???",
    combo: new Set(["fighter", "thief"])
  }
};

Object.defineProperty(SYSTEM.PROGRESSION_CORE_PATHS, "combo", {
  value: _getCombo, configurable: true
});

function _getCombo(a, b) {
  for (const [k, {combo}] of Object.entries(SYSTEM.PROGRESSION_MIXED_PATHS)) {
    if (combo.has(a) && combo.has(b)) return k;
  }
}

SYSTEM.PROGRESSION_MARGINS = {
  lower: 45,
  higher: 55
};
