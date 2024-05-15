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

/**
 * @typedef {object} HealingTypeConfig
 * @property {string} label     Displayed label of the healing type.
 * @property {string} color     Associated default color.
 * @property {string} icon      FA icon used for the healing type.
 */

/**
 * Healing types and relevant properties.
 * @enum {HealingTypeConfig}
 */
SYSTEM.HEALING_TYPES = {
  healing: {
    label: "ARTICHRON.HealingType.Healing",
    color: "33FF33",
    icon: "fa-solid fa-heart"
  }
};

/**
 * @typedef {object} SpellTargetTypes
 * @property {string} label             Displayed label of the targeting type.
 * @property {Set<string>} scale        The properties that can scale with mana.
 * @property {string} modifier          The die modifier to attach to this damage roll.
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
    count: [1, 1],
    distance: [4, 2],
    width: [1, 1]
  },
  cone: {
    label: "ARTICHRON.SpellShape.AreaCone",
    scale: new Set(["count", "distance"]),
    modifier: "min2",
    count: [1, 1],
    distance: [3, 2]
  },
  tee: {
    label: "ARTICHRON.SpellShape.AreaTee",
    scale: new Set(["count", "distance"]),
    modifier: "min2",
    count: [1, 1],
    distance: [3, 2]
  },
  circle: {
    label: "ARTICHRON.SpellShape.AreaCircle",
    scale: new Set(["count", "radius", "range"]),
    modifier: "",
    count: [1, 1],
    radius: [1, 1],
    range: [5, 2]
  },
  star: {
    label: "ARTICHRON.SpellShape.AreaStar",
    scale: new Set(["count", "radius", "range"]),
    modifier: "",
    count: [1, 1],
    radius: [1, 1],
    range: [5, 2]
  },
  radius: {
    label: "ARTICHRON.SpellShape.AreaRadius",
    scale: new Set(["radius"]),
    modifier: "rr",
    radius: [2, 1]
  },
  bang: {
    label: "ARTICHRON.SpellShape.AreaBang",
    scale: new Set(["radius"]),
    modifier: "rr",
    radius: [2, 1]
  }
};

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
  gun: {label: "ARTICHRON.WeaponType.Gun"},
  hammer: {label: "ARTICHRON.WeaponType.Hammer"},
  meteorHammer: {label: "ARTICHRON.WeaponType.MeteorHammer"},
  nunChuck: {label: "ARTICHRON.WeaponType.NunChuck"},
  rifle: {label: "ARTICHRON.WeaponType.Rifle"},
  spear: {label: "ARTICHRON.WeaponType.Spear"},
  sword: {label: "ARTICHRON.WeaponType.Sword"}
};

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
  }
};

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

/**
 * @typedef {object} ArmorTypeConfig
 * @property {string} label     The human-readable label of this weapon type.
 */

/**
 * Armor subtypes.
 * @enum {ArmorTypeConfig}
 */
SYSTEM.ARMOR_TYPES = {
  accessory: {label: "ARTICHRON.ArmorType.Accessory"},
  arms: {label: "ARTICHRON.ArmorType.Arms"},
  chest: {label: "ARTICHRON.ArmorType.Chest"},
  head: {label: "ARTICHRON.ArmorType.Head"},
  legs: {label: "ARTICHRON.ArmorType.Legs"},
  boots: {label: "ARTICHRON.ArmorType.Boots"}
};

/**
 * @typedef {object} ElixirTypeConfig
 */

/**
 * Elixir subtypes.
 * @enum {ElixirTypeConfig}
 */
SYSTEM.ELIXIR_TYPES = {};

/**
 * @typedef {object} EffectDurationConfig
 * @property {string} label     The human-readable label of this weapon type.
 */

/**
 * Effect duration types.
 * @enum {EffectDurationConfig}
 */
SYSTEM.EFFECT_DURATION_TYPES = {
  none: {label: "ARTICHRON.EffectProperty.DurationNone"},
  combat: {label: "ARTICHRON.EffectProperty.DurationCombat"},
  day: {label: "ARTICHRON.EffectProperty.DurationDay"}
};
