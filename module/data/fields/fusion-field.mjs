const { EmbeddedDataField, NumberField, SetField, StringField } = foundry.data.fields;
const { DataModel } = foundry.abstract;

export default class FusionField extends EmbeddedDataField {
  constructor(options = {}, context = {}) {
    super(FusionData, options, context);
  }
}

/* -------------------------------------------------- */

class FusionData extends DataModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      ignore: new SetField(new StringField()),
      max: new NumberField({ integer: true, min: 0, initial: 1, nullable: false }),
    };
  }

  /* -------------------------------------------------- */

  /**
   * The item.
   * @type {ItemArtichron}
   */
  get item() {
    return this.parent.parent;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Pick one of the fusion options of this item, grant it to a target item, and destroy this.
   * @param {ItemArtichron} target                The target item.
   * @param {ActiveEffectArtichron} [fusion]      The fusion template effect. If omitted, use defaults.
   * @returns {Promise<ActiveEffectArtichron>}    The created fusion effect.
   */
  async fuse(target, fusion) {
    const Cls = foundry.utils.getDocumentClass("ActiveEffect");
    const item = this.item;

    const effect = fusion ? fusion.clone() : new Cls({
      type: "fusion",
      name: game.i18n.format("ARTICHRON.ItemFusionDialog.DefaultFusion", { name: item.name }),
      img: item.img,
    }, { parent: item });

    effect.updateSource({ "system.itemData": game.items.fromCompendium(item, { clearFolder: true, keepId: true }) });

    const effectData = effect.toObject();
    effectData.changes = target.system.fusion.createFusionData(effect);

    const created = await Cls.create(effectData, { parent: target });
    await item.delete();
    return created;
  }

  /* -------------------------------------------------- */

  /**
   * Prompt a dialog to pick a valid fusion target and effect, then pass the selection off to the 'fuse' method.
   * @returns {Promise<ActiveEffectArtichron|null>}
   */
  async fuseDialog() {
    const item = this.item;
    const actor = item.actor;
    if (!item.isEmbedded) throw new Error("An unowned item cannot be fused.");
    if (!actor.canPerformActionPoints(1)) {
      ui.notifications.warn("ARTICHRON.Warning.MissingActionPoints", { localize: true });
      return null;
    }

    const prompt = await artichron.applications.apps.ItemFusionDialog.create({ item });
    if (!prompt) return null;
    const target = actor.items.get(prompt.itemId);
    const effect = prompt.effectId === "default" ? null : item.effects.get(prompt.effectId);

    if (actor.inCombat) await actor.spendActionPoints(1);

    return this.fuse(target, effect);
  }

  /* -------------------------------------------------- */

  /**
   * Prompt a dialog to pick an active fusion on this item to end.
   * @returns {Promise<ItemArtichron|null>}   A promise that resolves to the recreated item.
   */
  async unfuseDialog() {
    const item = this.item;
    if (!item.isFused) return null;
    const choices = item.effects.reduce((acc, e) => {
      if (e.isActiveFusion) acc[e.id] = e.name;
      return acc;
    }, {});
    const field = new StringField({
      choices: choices,
      required: true,
      label: "ARTICHRON.ItemFusionDialog.SplitLabel",
      hint: "ARTICHRON.ItemFusionDialog.SplitHint",
    }).toFormGroup({ localize: true }, { name: "effectId" }).outerHTML;
    const data = await artichron.applications.api.Dialog.input({
      modal: true,
      content: `<fieldset>${field}</fieldset>`,
      ok: {
        label: "ARTICHRON.ItemFusionDialog.Split",
      },
      window: {
        title: game.i18n.format("ARTICHRON.ItemFusionDialog.TitleUnfuse", { item: item.name }),
        icon: "fa-solid fa-recycle",
      },
    });
    if (!data) return null;
    return item.effects.get(data.effectId).system.unfuse();
  }

  /* -------------------------------------------------- */

  /**
   * Create fusion data using a fusion effect from a source item with the target being this item.
   * @param {ActiveEffectArtichron} effect    The selected effect.
   * @returns {object[]}                      An array of effect change data.
   */
  createFusionData(effect) {
    const source = effect.parent;
    const item = this.item;
    const changes = [];

    const ignoredChanges = effect.changes.reduce((acc, change) => {
      if (change.key.startsWith("system")) acc.add(change.key.slice(7));
      else acc.add(change.key);
      return acc;
    }, new Set(effect.parent.system.fusion.ignore));

    // Attributes are merged.
    let path = "attributes.value";
    let ifield = item.system.schema.getField(path);
    let sfield = source.system.schema.getField(path);
    if (!ignoredChanges.has(path) && ifield && sfield) {
      const value = Array.from(foundry.utils.getProperty(source.system, path)).filter(key => {
        return artichron.config.ITEM_ATTRIBUTES[key].transferrable !== false;
      }).join(", ");
      if (value) changes.push({ key: `system.${path}`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: value });
    }

    // Half the source item's price is added.
    path = "price.value";
    ifield = item.system.schema.getField(path);
    sfield = source.system.schema.getField(path);
    if (!ignoredChanges.has(path) && ifield && sfield) {
      const value = Math.ceil(foundry.utils.getProperty(source.system, path) / 2);
      if (value) changes.push({ key: `system.${path}`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: String(value) });
    }

    // Half the source item's weight is added.
    path = "weight.value";
    ifield = item.system.schema.getField(path);
    sfield = source.system.schema.getField(path);
    if (!ignoredChanges.has(path) && ifield && sfield) {
      const value = Math.ceil(foundry.utils.getProperty(source.system, path) / 2);
      if (value) changes.push({ key: `system.${path}`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: String(value) });
    }

    // Half the source item's defenses are added.
    path = "defenses";
    ifield = item.system.schema.getField(path);
    sfield = source.system.schema.getField(path);
    if (!ignoredChanges.has(path) && ifield && sfield && item.isArmor && source.isArmor) {
      for (const field of sfield) {
        const valueField = field.fields.value;
        const value = Math.ceil(foundry.utils.getProperty(source, valueField.fieldPath) / 2);
        if (value) changes.push({ key: valueField.fieldPath, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: String(value) });
      }
    }

    // All activities are added.
    const ignoredActivity = activity => {
      switch (activity.type) {
        case "damage":
        case "teleport":
          return item.type !== "spell";
        case "defend":
          return !["weapon", "shield"].includes(item.type);
        case "effect":
        case "healing":
          return true;
      }
      throw new Error(`Invalid activity type '${activity.type}'.`);
    };
    for (const activity of source.system.activities) {
      if (ignoredActivity(activity)) continue;
      const data = activity.toObject();
      data._id = foundry.utils.randomID();
      changes.push({ key: "activity", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: JSON.stringify(data) });
    }

    // Any valid changes from the effect are added as well.
    for (const change of effect.changes) {
      if (this.parent.constructor.BONUS_FIELDS.has(change.key)) changes.push({ ...change });
    }

    return changes;
  }

  /* -------------------------------------------------- */

  /**
   * Construct an array of changes that will be applying to this item if a given fusion
   * effect is chosen from its source item.
   * @param {ActiveEffectArtichron} effect    The selected effect.
   * @returns {object[]}                      An array of objects, each with path, label, and the old and new values.
   */
  createFusionTranslation(effect) {
    const source = effect.parent;
    const changes = this.createFusionData(effect);
    const item = this.item;

    const clone = item.clone();
    clone.applyActiveEffects(); // unsure why this is needed.
    const update = [];
    for (const change of changes) {
      const path = change.key;
      const field = path.startsWith("system.") ?
        source.system.schema.getField(path.slice(7)) :
        source.schema.getField(path);
      if (!field) continue;
      const newValue = foundry.utils.getDocumentClass("ActiveEffect").applyField(clone, change, field);
      update.push({
        oldValue: foundry.utils.getProperty(item, path) ?? 0,
        newValue: newValue,
        label: field.label || path,
        path: path,
      });
    }
    return update;
  }
}
