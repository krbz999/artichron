/* -------------------------------------------------- */
/*   Pseudo-Documents                                 */
/* -------------------------------------------------- */

/** Metadata for a pseudo-document. */
export interface PseudoDocumentMetadata {
  /** Document name used for this pseudo document. */
  documentName: string;
  /** A record of document names for pseudo documents and the path to their collection. */
  embedded: Record<string, string>;
  /** The sheet class used to render this pseudo document if it has a sheet. */
  sheetClass?: typeof foundry.applications.api.Application;
  /** A record of this pseudo document's base class and subtypes. */
  types?: Record<string, typeof artichron.data.pseudoDocument.PseudoDocument>;
}

/** Metadata for activities. */
export interface ActivityMetadata extends PseudoDocumentMetadata {
  /** File path to activity default icon. */
  icon: string;
  /** i18n path to an activity type's default name. */
  label: string;
}

/** Metadata for armor requirements. */
export interface ArmorRequirementMetadata extends PseudoDocumentMetadata {
  /** i18n path for display hint. */
  hint: string;
  /** i18n path for display label. */
  label: string;
}

/** Metadata for clocks. */
export interface ClockMetadata extends PseudoDocumentMetadata {
  /** Hex string for default color. */
  color: string;
  /** i18n path for default name. */
  label: string;
}

export interface DamagePartMetadata extends PseudoDocumentMetadata {
  /** i18n path for default name. */
  label: string;
}

/* -------------------------------------------------- */
/*   Document Subtypes Metadata                       */
/* -------------------------------------------------- */

/** Base metadata for all system document subtypes. */
export interface DocumentSubtypeMetadata {
  /** Record of pseudo-documents and their collection's property. */
  embedded: Record<string, string>
  /** Type icon for this data model if this document type makes use of icons. */
  icon?: string;
  /** Internal key used for this data model. */
  type: string;
}

/** Metadata for active effect subtypes. */
export interface ActiveEffectSubtypeMetadata extends DocumentSubtypeMetadata {}

/** Metadata for actor subtypes. */
export interface ActorSubtypeMetadata extends DocumentSubtypeMetadata {}

/** Metadata for party actors. */
export interface PartyActorMetadata extends ActorSubtypeMetadata {
  /** The actor types allowed to be added to a party actor. */
  allowedActorTypes: Set<string>
}

/** Metadata for chat message subtypes. */
export interface ChatMessageSubtypeMetadata extends DocumentSubtypeMetadata {}

/** Metadata for combatant subtypes. */
export interface CombatantSubtypeMetadata extends DocumentSubtypeMetadata {}

/** Metadata for item subtypes. */
export interface ItemSubtypeMetadata extends DocumentSubtypeMetadata {
  /** The initial weight of a new item of this type. */
  defaultWeight: number;
  /** Whether this item type allows being fused or fused onto. */
  fusion: boolean;
  /** The inventory section an item type gets placed in on an actor's inventory tab. */
  inventorySection: string;
  /** The order this inventory section is in relative to other sections. */
  order: number;
}

export interface RegionBehaviorSubtypeMetadata extends DocumentSubtypeMetadata {}

/* -------------------------------------------------- */
/*   Roll Configurations                              */
/* -------------------------------------------------- */

export interface RollConfiguration {
  /** The click event that initiated the roll. */
  event?: PointerEvent;
}

export interface PoolRollConfiguration extends RollConfiguration {
  /** The pool to roll. */
  pool?: string;
  /** The amount to roll and consume. */
  amount?: number;
}

export interface SkillRollConfiguration extends RollConfiguration {
  /** The primary skill to use. */
  base?: string;
  /** The secondary skill to use. */
  second?: string;
}

export interface RollDialogConfiguration {
  /** Whether a dialog should be prompted. */
  configure?: boolean;
}

export interface RollMessageConfiguration {
  /** Whether to create the chat message. */
  create?: boolean;
  /** Data to use for the ChatMessage. */
  messageData?: object;
}
