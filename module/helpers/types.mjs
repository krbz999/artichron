/**
 * @typedef {object} Point
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {object} SystemModelMetadata
 * @property {string} icon      Type icon for this data model.
 * @property {string} type      Internal key used for this data model.
 */

/**
 * @typedef {object} ActiveEffectSystemModelMetadata
 * @property {string} type      Internal key used for this data model.
 */

/**
 * @typedef {object} ActorSystemModelMetadata
 * @property {string} type                          Internal key used for this data model.
 * @property {Set<string>} [allowedActorTypes]      The actor types allowed to be added to a party actor.
 */

/**
 * @typedef {object} ChatMessageSystemModelMetadata
 * @property {string} type      Internal key used for this data model.
 */

/**
 * @typedef {object} CombatantSystemModelMetadata
 * @property {string} type      Internal key used for this data model.
 */

/**
 * @typedef {object} ItemSystemModelMetadata
 * @property {boolean} fusion               Whether this item type allows being fused or fused onto.
 * @property {number} defaultWeight         The initial weight of a new item of this type.
 * @property {number} order                 The order this inventory section is in relative to other sections.
 * @property {string} inventorySection      The inventory section an item type gets placed in on an actor's inventory tab.
 * @property {string} type                  The internal name of this item type.
 */
