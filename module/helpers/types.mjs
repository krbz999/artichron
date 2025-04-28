/**
 * @typedef {object} Point
 * @property {number} x
 * @property {number} y
 * @property {number} [elevation]
 */

/* -------------------------------------------------- */

/**
 * @typedef {Object} PseudoDocumentMetadata
 * @property {string} documentName                            Document name used for this pseudo document.
 * @property {Record<string, string>} embedded                A record of document names for pseudo documents and the
 *                                                            path to their collection.
 * @property {Record<string, typeof PseudoDocument>} types    A record of this pseudo document's base class and subtypes.
 */

/**
 * @typedef {PseudoDocumentMetadata} ActivityMetadata
 * @property {string} icon                      File path to activity default icon.
 * @property {string} label                     i18n path to an activity type's default name.
 * @property {typeof Application} sheetClass    The sheet class used to render this pseudo document.
 */

/**
 * @typedef {PseudoDocumentMetadata} ArmorRequirementMetadata
 * @property {string} hint    i18n path for display hint.
 * @property {string} label   i18n path for display label.
 */

/**
 * @typedef {PseudoDocumentMetadata} ClockMetadata
 * @property {string} color                     Hex string for default color.
 * @property {string} defaultName               i18n path for default name.
 * @property {typeof Application} sheetClass    The sheet class used to render this pseudo document.
 */

/**
 * @typedef {PseudoDocumentMetadata} DamagePartMetadata
 * @property {string} defaultName               i18n path for default name.
 * @property {typeof Application} sheetClass    The sheet class used to render this pseudo document.
 */

/* -------------------------------------------------- */

/**
 * @typedef {object} SystemModelMetadata
 * @property {string} icon    Type icon for this data model.
 * @property {string} type    Internal key used for this data model.
 */

/**
 * @typedef {object} ActiveEffectSystemModelMetadata
 * @property {string} type    Internal key used for this data model.
 */

/**
 * @typedef {object} ActorSystemModelMetadata
 * @property {string} type                          Internal key used for this data model.
 * @property {Set<string>} [allowedActorTypes]      The actor types allowed to be added to a party actor.
 * @property {Record<string, string>} [embedded]    Record of pseudo-documents and their collection's property.
 */

/**
 * @typedef {object} ChatMessageSystemModelMetadata
 * @property {string} type    Internal key used for this data model.
 */

/**
 * @typedef {object} CombatantSystemModelMetadata
 * @property {string} type    Internal key used for this data model.
 */

/**
 * @typedef {object} ItemSystemModelMetadata
 * @property {boolean} fusion                       Whether this item type allows being fused or fused onto.
 * @property {number} defaultWeight                 The initial weight of a new item of this type.
 * @property {number} order                         The order this inventory section is in relative to other sections.
 * @property {string} inventorySection              The inventory section an item type gets
 *                                                  placed in on an actor's inventory tab.
 * @property {string} type                          The internal name of this item type.
 * @property {Record<string, string>} [embedded]    Record of pseudo-documents and their collection's property.
 */

/* -------------------------------------------------- */

/**
 * @typedef {object} RollConfiguration
 * @property {PointerEvent} [event]   The click event that initiated the roll.
 */

/**
 * @typedef {RollConfiguration} PoolRollConfiguration
 * @property {string} [pool]      The pool to roll.
 * @property {number} [amount]    The amount to roll and consume.
 */

/**
 * @typedef {RollConfiguration} SkillRollConfiguration
 * @property {string} [base]      The primary skill to use.
 * @property {string} [second]    The secondary skill to use.
 */

/**
 * @typedef {object} RollDialogConfiguration
 * @property {boolean} [configure]    Whether a dialog should be prompted.
 */

/**
 * @typedef {object} RollMessageConfiguration
 * @property {boolean} [create]       Whether to create the chat message.
 * @property {object} [messageData]   Data to use for the ChatMessage.
 */
