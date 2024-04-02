export const SYSTEM = {};

// Resistance percentages. Not currently in use since resistances subtract numeric values, not percentages.
SYSTEM.RESISTANCE = {
  VALUES: [0, 0.25, 0.5, 0.75, 1],
  MAX: 4
};

/**
 * @typedef {object} DamageTypeConfiguration
 * @property {string} label             Displayed label of the damage type.
 * @property {string} color             Associated default color.
 * @property {string} icon              FA icon used for the damage type.
 * @property {boolean} [elemental]      ...?
 * @property {boolean} [resist]         Whether this damage type can be resisted.
 * @property {boolean} [block]          Whether this damage type can be blocked.
 * @property {boolean} [parry]          Whether this damage type can be parried.
 * @property {boolean} [armor]          Whether this damage type is resisted by armor rating.
 */

/**
 * Damage types and relevant properties.
 * @enum {DamageTypeConfiguration}
 */
SYSTEM.DAMAGE_TYPES = {
  fire: {
    label: "ARTICHRON.DamageTypeFire",
    color: "FF5733",
    icon: "fa-solid fa-fire",
    elemental: true,
    resist: true
  },
  wind: {
    label: "ARTICHRON.DamageTypeWind",
    color: "8DEEB5",
    icon: "fa-solid fa-wind",
    elemental: true,
    resist: true
  },
  lightning: {
    label: "ARTICHRON.DamageTypeLightning",
    color: "4B70A8",
    icon: "fa-solid fa-bolt",
    elemental: true,
    resist: true
  },
  ice: {
    label: "ARTICHRON.DamageTypeIce",
    color: "54D7E0",
    icon: "fa-solid fa-snowflake",
    elemental: true,
    resist: true
  },
  light: {
    label: "ARTICHRON.DamageTypeLight",
    color: "FCFFBF",
    icon: "fa-solid fa-sun",
    resist: true
  },
  darkness: {
    label: "ARTICHRON.DamageTypeDarkness",
    color: "910B94",
    icon: "fa-solid fa-moon",
    resist: true
  },
  physical: {
    label: "ARTICHRON.DamageTypePhysical",
    color: "868686",
    icon: "fa-solid fa-hand-fist",
    block: true,
    parry: true,
    armor: true
  },
  arcane: {
    label: "ARTICHRON.DamageTypeArcane",
    color: "C79FFF",
    icon: "fa-solid fa-wand-sparkles",
    block: true,
    resist: true
  }
};

/**
 * @typedef {object} HealingTypeConfiguration
 * @property {string} label     Displayed label of the healing type.
 * @property {string} color     Associated default color.
 * @property {string} icon      FA icon used for the healing type.
 * @property {number} faces     The default size of the die of this type.
 */

/**
 * Healing types and relevant properties.
 * @enum {HealingTypeConfiguration}
 */
SYSTEM.HEALING_TYPES = {
  healing: {
    label: "ARTICHRON.HealingTypeHealing",
    color: "33FF33",
    icon: "fa-solid fa-heart",
    faces: 8
  }
};

/**
 * @typedef {object} SpellTargetTypes
 * @property {string} label             Displayed label of the targeting type.
 * @property {Set<string>} scale        The properties that can scale with mana.
 * @property {number} faces             The size of the die this will add to the spell.
 * @property {number[]} [count]         The default count and how much each increase is.
 * @property {number[]} [range]         The default range and how much each increase is.
 * @property {number[]} [distance]      The default distance and how much each increase is.
 * @property {number[]} [width]         The default width and how much each increase is.
 * @property {number[]} [radius]        The default radius and how much each increase is.
 */

/**
 * The types of targeting a spell can make.
 * @enum {SpellTargetTypes}
 */
SYSTEM.SPELL_TARGET_TYPES = {
  single: {
    label: "ARTICHRON.SpellType.SingleTarget",
    scale: new Set(["count", "range"]),
    faces: 12,
    count: [1, 1],
    range: [6, 2]
  },
  ray: {
    label: "ARTICHRON.SpellType.AreaRay",
    scale: new Set(["distance", "width"]),
    faces: 10,
    distance: [4, 2],
    width: [1, 1]
  },
  cone: {
    label: "ARTICHRON.SpellType.AreaCone",
    scale: new Set(["distance"]),
    faces: 8,
    distance: [3, 2]
  },
  circle: {
    label: "ARTICHRON.SpellType.AreaCircle",
    scale: new Set(["radius", "range"]),
    faces: 4,
    radius: [1, 1],
    range: [10, 2]
  },
  radius: {
    label: "ARTICHRON.SpellType.AreaRadius",
    scale: new Set(["radius"]),
    faces: 6,
    radius: [2, 1]
  }
};

// The types of physical defensive traits.
SYSTEM.DEFENSE_TYPES = {
  armor: "",
  parry: "",
  block: ""
};

// The array of damage dice values.
SYSTEM.DIE_SIZES = {
  2: "d2",
  3: "d3",
  4: "d4",
  5: "d5",
  6: "d6",
  8: "d8",
  10: "d10",
  12: "d12",
  20: "d20",
  100: "d100"
};

// Movement types.
SYSTEM.MOVEMENT_TYPES = {
  running: {label: "ARTICHRON.MovementRunning"},
  flying: {label: "ARTICHRON.MovementFlying"},
  swimming: {label: "ARTICHRON.MovementSwimming"}
};

// Weapon subtypes.
SYSTEM.ARSENAL_TYPES = {
  melee: {
    label: "ARTICHRON.ArsenalCategoryMelee",
    items: {
      axe: {label: "ARTICHRON.WeaponTypeAxe"},
      hammer: {label: "ARTICHRON.WeaponTypeHammer"},
      spear: {
        label: "ARTICHRON.WeaponTypeSpear",
        fusion: {range: 1, hands: 2, damage: "1d6"} // bonuses on top of used target.
      },
      sword: {label: "ARTICHRON.WeaponTypeSword"}
    }
  },
  ranged: {
    label: "ARTICHRON.ArsenalCategoryRanged",
    items: {
      bow: {label: "ARTICHRON.WeaponTypeBow"}
    }
  },
  shield: {
    label: "ARTICHRON.ArsenalCategoryShield",
    items: {
      buckler: {
        label: "ARTICHRON.ShieldTypeBuckler",
        width: 1
      },
      heater: {
        label: "ARTICHRON.ShieldTypeHeater",
        width: 2
      },
      kite: {
        label: "ARTICHRON.ShieldTypeKite",
        width: 3
      }
    }
  },
  spell: {
    label: "ARTICHRON.ArsenalCategorySpell",
    items: {
      offense: {label: "ARTICHRON.SpellTypeOffense"},
      defense: {label: "ARTICHRON.SpellTypeDefense"},
      buff: {label: "ARTICHRON.SpellTypeBuff"}
    }
  }
};

// Armor subtypes.
SYSTEM.ARMOR_TYPES = {
  accessory: {label: "ARTICHRON.ArmorTypeAccessory"},
  arms: {label: "ARTICHRON.ArmorTypeArms"},
  chest: {label: "ARTICHRON.ArmorTypeChest"},
  head: {label: "ARTICHRON.ArmorTypeHead"},
  legs: {label: "ARTICHRON.ArmorTypeLegs"},
  boots: {label: "ARTICHRON.ArmorTypeBoots"}
};

// Monster part types.
SYSTEM.MONSTER_PART_TYPES = {
  eye: {label: "ARTICHRON.MonsterPartTypeEye"},
  fang: {label: "ARTICHRON.MonsterPartTypeFang"},
  heart: {label: "ARTICHRON.MonsterPartTypeHeart"},
  horn: {label: "ARTICHRON.MonsterPartTypeHorn"},
  tail: {label: "ARTICHRON.MonsterPartTypeTail"}
};

// Elixir subtypes.
SYSTEM.ELIXIR_TYPES = {};

// Armor set identifiers.
// bonus could be a function or a static bonus, idk
SYSTEM.ARMOR_SETS = {
  flame: {label: "ARTICHRON.ArmorSetFlame", bonus: {}},
  glam: {label: "ARTICHRON.ArmorSetGlam", bonus: {}}
};
