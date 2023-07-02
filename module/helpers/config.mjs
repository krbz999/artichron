export const SYSTEM = {};

// Fighting styles.
SYSTEM.FIGHTING_STYLES = {
  SPELL: 0,
  MELEE_ONE: 1,
  MELEE_TWO: 2,
  MELEE_DUAL: 3,
  RANGED: 4
};

// Resistance percentages.
SYSTEM.RESISTANCE_VALUES = {
  1: 0.25,
  2: 0.50,
  3: 0.75,
  4: 1.00
};

/**
 * Damage types.
 * The type of damage that can be inflicted.
 * If resist, the type is a valid one for armor to grant resistance to.
 * If block, the type is a valid one for a shield to block.
 * If parry, the type is a valid one for weapons to parry.
 * if armor, the type is reduced by the target's armor rating.
 * If elemental, ...?
 */
SYSTEM.DAMAGE_TYPES = {
  fire: {
    label: "ARTICHRON.DamageTypeFire",
    color: "FF5733",
    icon: "fa-solid fa-fire",
    elemental: true, resist: true
  },
  wind: {
    label: "ARTICHRON.DamageTypeWind",
    color: "8DEEB5",
    icon: "fa-solid fa-wind",
    elemental: true, resist: true
  },
  lightning: {
    label: "ARTICHRON.DamageTypeLightning",
    color: "4B70A8",
    icon: "fa-solid fa-wind",
    elemental: true, resist: true
  },
  ice: {
    label: "ARTICHRON.DamageTypeIce",
    color: "54D7E0",
    icon: "fa-solid fa-snowflake",
    elemental: true, resist: true
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
    icon: "fa-solid fa-dumbbell",
    block: true, parry: true, armor: true
  },
  arcane: {
    label: "ARTICHRON.DamageTypeArcane",
    color: "C79FFF",
    icon: "fa-solid fa-crystal-ball",
    block: true, resist: true
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
  12: "d12"
};

// Movement types.
SYSTEM.MOVEMENT_TYPES = {
  running: {label: "ARTICHRON.MovementRunning"},
  flying: {label: "ARTICHRON.MovementFlying"},
  swimming: {label: "ARTICHRON.MovementSwimming"}
};

// Weapon subtypes.
SYSTEM.WEAPON_TYPES = {
  axe: {label: "ARTICHRON.WeaponTypeAxe"},
  bow: {label: "ARTICHRON.WeaponTypeBow"},
  hammer: {label: "ARTICHRON.WeaponTypeHammer"},
  spear: {
    label: "ARTICHRON.WeaponTypeSpear",
    fusion: {range: 1, hands: 2, damage: "1d6"} // bonuses on top of used target.
  },
  sword: {label: "ARTICHRON.WeaponTypeSword"}
};

// Shield types.
SYSTEM.SHIELD_TYPES = {
  bucker: {label: "ARTICHRON.ShieldTypeBuckler"},
  heater: {label: "ARTICHRON.ShieldTypeHeater"},
  kite: {label: "ARTICHRON.ShieldTypeKite"}
};

// Armor subtypes.
SYSTEM.ARMOR_TYPES = {
  head: {label: "ARTICHRON.ArmorTypeHead"},
  chest: {label: "ARTICHRON.ArmorTypeChest"},
  arms: {label: "ARTICHRON.ArmorTypeArms"},
  legs: {label: "ARTICHRON.ArmorTypeLegs"},
  accessory: {label: "ARTICHRON.ArmorTypeAccessory"}
};

// Spell types.
SYSTEM.SPELL_TYPES = {
  offense: {label: "ARTICHRON.SpellTypeOffense"},
  defense: {label: "ARTICHRON.SpellTypeDefense"},
  buff: {label: "ARTICHRON.SpellTypeBuff"}
};

// Armor set identifiers.
// bonus could be a function or a static bonus, idk
SYSTEM.ARMOR_SETS = {
  "flame": {label: "ARTICHRON.SetFlame", bonus: {}}
};
