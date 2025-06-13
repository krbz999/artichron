/* -------------------------------------------------- */
/*   Pseudo-Documents                                 */
/* -------------------------------------------------- */

/** Metadata for a pseudo-document. */
export interface PseudoDocumentMetadata {
  /** File path to a pseudo-document's default artwork. */
  defaultImage: string;
  /** Document name used for this pseudo document. */
  documentName: string;
  /** A record of document names for pseudo documents and the path to their collection. */
  embedded: Record<string, string>;
  /** The sheet class used to render this pseudo document if it has a sheet. */
  sheetClass?: typeof foundry.applications.api.Application;
  /** A record of this pseudo document's base class and subtypes. */
  types?: Record<string, typeof artichron.data.pseudoDocument.PseudoDocument>;
}

/** Metadata for armor requirements. */
export interface ArmorRequirementMetadata extends PseudoDocumentMetadata {
  /** i18n path for display hint. */
  hint: string;
}

/** Metadata for clocks. */
export interface ClockMetadata extends PseudoDocumentMetadata {
  /** Hex string for default color. */
  color: string;
}

/* -------------------------------------------------- */
/*   Advancements                                     */
/* -------------------------------------------------- */

export interface AdvancementChainLink {
  /* The advancement of this link in the chain. */
  advancement: BaseAdvancement;
  /* Child advancements (can be understood as the inverse of `parent`). If an item granted by *this* advancement grants
  no advancements, nothing is recorded here. The key is the id of the "granted" advancement. */
  children: Record<string, AdvancementChainLink>;
  /* The 'parent' advancement, if this advancement is from an item granted by another advancement. This can also be
  a progression stored on an actor - in which case, it always means that this link was directly from a Path item. */
  parent: AdvancementChainLink | Progression | null;
  /* Granted items from this advancement and their configuration. */
  pool: object[];
  /* Is this the root of the chain? */
  root: boolean;
}

/* -------------------------------------------------- */
/*   Document Subtypes Metadata                       */
/* -------------------------------------------------- */

/** Base metadata for all system document subtypes. */
export interface DocumentSubtypeMetadata {
  /** Record of pseudo-documents and their collection's property. */
  embedded: Record<string, string>;
  /** Type icon for this data model if this document type makes use of icons. */
  icon?: string;
  /** Internal key used for this data model. */
  type: string;
}

/** Metadata for party actors. */
export interface PartyActorMetadata extends DocumentSubtypeMetadata {
  /** The actor types allowed to be added to a party actor. */
  allowedActorTypes: Set<string>;
}

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

/* -------------------------------------------------- */
/*   Roll Configurations                              */
/* -------------------------------------------------- */

export interface RollConfiguration {
  /** The click event that initiated the roll. */
  event?: PointerEvent;
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

/* -------------------------------------------------- */
/*   Callbacks                                        */
/* -------------------------------------------------- */

/**
 * Prepare context for a specific part.
 * @param {object} context      Rendering context. **will be mutated**
 * @param {object} options      Rendering options.
 * @returns {Promise<object>}   A promise that resolves to the mutated rendering context.
 */
export interface ContextPartHandler {
  (context: object, options: object): Promise<object>;
}
