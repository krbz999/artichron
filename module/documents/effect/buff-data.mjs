import ActiveEffectSystemModel from "./system-model.mjs";

const {DocumentUUIDField, BooleanField, StringField} = foundry.data.fields;

/**
 * System data for "Buffs".
 * Buffs are effects that apply to an actor. They can live on an item or actor and are granted from a source.
 * @property {string} source        The uuid of a source item this effect was granted by.
 * @property {boolean} granted      Has this been granted?
 */
export default class EffectBuffData extends ActiveEffectSystemModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      source: new DocumentUUIDField({type: "Item", embedded: true, label: "ARTICHRON.EffectProperty.Source"}),
      granted: new BooleanField({label: "ARTICHRON.EffectProperty.Granted"}),
      subtype: new StringField({
        label: "ARTICHRON.EffectProperty.SubtypeBuff",
        hint: "ARTICHRON.EffectProperty.SubtypeBuffHint",
        choices: () => {
          const choices = foundry.utils.deepClone(CONFIG.Actor.typeLabels);
          delete choices.base;
          return choices;
        }
      })
    };
  }

  /* -------------------------------------------------- */

  get isGranted() {
    return !!this.source && this.granted;
  }

  /* -------------------------------------------------- */

  /** @override */
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

  /** @override */
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
