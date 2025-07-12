import ActiveEffectSystemModel from "./system-model.mjs";

const { DocumentUUIDField, BooleanField, StringField } = foundry.data.fields;

/**
 * System data for "Buffs".
 * Buffs are effects that apply to an actor. They can live on an item or actor and are granted from a source.
 * @property {string} source        The uuid of a source item this effect was granted by.
 * @property {boolean} granted      Has this been granted?
 */
export default class EffectBuffData extends ActiveEffectSystemModel {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {});
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      source: new DocumentUUIDField({ type: "Item", embedded: true }),
      granted: new BooleanField(),
    };
  }

  /* -------------------------------------------------- */

  /**
   * Is there some system logic that makes this active effect ineligible for application?
   * @type {boolean}
   */
  get isSuppressed() {
    if (this.parent.parent?.type === "party") return true;
    if (this.parent.parent?.actor?.type === "party") return true;
    return false;
  }

  /* -------------------------------------------------- */

  /**
   * Is this buff granted or dormant on its source?
   * @type {boolean}
   */
  get isGranted() {
    return !!this.source && this.granted;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  getRollData() {
    if (!this.source) return {};

    let source;
    try {
      source = fromUuidSync(this.source);
    } catch (err) {
      console.warn(err);
      return {};
    }
    return source.getRollData?.() ?? {};
  }

  /* -------------------------------------------------- */

  /**
   * A store of granted buffs.
   * @type {Map<string, Set<string>>}
   */
  static origins = new Map();

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Buffs do not apply to the actor while on an elixir.
    if ((this.parent.parent.documentName === "Item") && (this.parent.parent.type === "elixir")) {
      this.parent.transfer = false;
    }

    if (!this.source || this.parent.uuid.startsWith("Item.") || this.parent.uuid.startsWith("Compendium.")) return;
    if (!EffectBuffData.origins.get(this.source)) EffectBuffData.origins.set(this.source, new Set());
    EffectBuffData.origins.get(this.source).add(this.parent.uuid);
  }
}
