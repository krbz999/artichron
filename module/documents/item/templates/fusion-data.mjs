const {NumberField, SchemaField} = foundry.data.fields;

export const FusionTemplateMixin = Base => {
  return class FusionTemplate extends Base {
    /** @override */
    static defineSchema() {
      const schema = super.defineSchema();
      schema.fusion = new SchemaField({
        max: new NumberField({integer: true, min: 0, initial: 1})
      });
      return schema;
    }

    /* -------------------------------------------------- */
    /*   Instance methods                                 */
    /* -------------------------------------------------- */

    /**
     * Pick one of the fusion options of this item, grant it to a target item, and destroy this.
     * @param {ItemArtichron} target                      The target item.
     * @param {ActiveEffectArtichron} fusion              The fusion template effect.
     * @returns {Promise<ActiveEffectArtichron|null>}     The created fusion effect.
     */
    async fuse(target, fusion) {
      const effect = fusion.clone();
      effect.updateSource({"system.itemData": game.items.fromCompendium(this.parent, {
        clearFolder: true, keepId: true
      })});

      const effectData = effect.toObject();
      effectData.changes = target.system.createFusionData(effect);

      await this.parent.delete();
      return getDocumentClass("ActiveEffect").create(effectData, {parent: target});
    }

    /* -------------------------------------------------- */

    /**
     * Prompt a dialog to pick a valid fusion target and effect, then pass the selection off to the 'fuse' method.
     * @returns {Promise<ActiveEffectArtichron|null>}
     */
    async fuseDialog() {
      if (!this.parent.actor.canPerformActionPoints(1)) {
        ui.notifications.warn("ARTICHRON.Warning.MissingActionPoints", {localize: true});
        return null;
      }

      const prompt = await artichron.applications.ItemFusionDialog.create(this.parent);
      if (!prompt) return null;
      const target = this.parent.actor.items.get(prompt.itemId);
      const effect = this.parent.effects.get(prompt.effectId);

      if (this.parent.actor.inCombat) await this.parent.actor.spendActionPoints(1);

      return this.fuse(target, effect);
    }

    /* -------------------------------------------------- */

    /**
     * Prompt a dialog to pick an active fusion on this item to end.
     * @returns {Promise<ItemArtichron|null>}     A promise that resolves to the recreated item.
     */
    async unfuseDialog() {
      if (!this.isFused) return null;
      const choices = this.parent.effects.reduce((acc, e) => {
        if (e.isActiveFusion) acc[e.id] = e.name;
        return acc;
      }, {});
      const field = new foundry.data.fields.StringField({
        choices: choices,
        blank: true
      });
      const id = await foundry.applications.api.DialogV2.prompt({
        rejectClose: false,
        modal: true,
        content: field.toInput({name: "effectId"}).outerHTML,
        ok: {
          label: "ARTICHRON.ItemFusionDialog.Confirm",
          callback: (event, button, html) => button.form.elements.effectId.value
        },
        window: {
          title: game.i18n.format("ARTICHRON.ItemFusionDialog.TitleUnfuse", {item: this.parent.name}),
          icon: "fa-solid fa-recycle"
        },
        position: {
          width: 300
        }
      });
      if (!id) return null;
      const effect = this.parent.effects.get(id);
      return effect.system.unfuse();
    }

    /* -------------------------------------------------- */

    /**
     * Create fusion data using a fusion effect from a source item with the target being this item.
     * @param {ActiveEffectArtichron} effect      The selected effect.
     * @returns {object[]}                        An array of effect change data.
     */
    createFusionData(effect) {
      const source = effect.parent;
      const item = this.parent;
      const changes = [];

      // Attributes are merged.
      let path = "attributes.value";
      let ifield = item.system.schema.getField(path);
      let sfield = source.system.schema.getField(path);
      if (ifield && sfield) {
        const value = Array.from(foundry.utils.getProperty(source.system, path)).filter(key => {
          return CONFIG.SYSTEM.ITEM_ATTRIBUTES[key].transferrable !== false;
        }).join(", ");
        if (value) changes.push({key: `system.${path}`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: value});
      }

      // Half the source item's price is added.
      path = "price.value";
      ifield = item.system.schema.getField(path);
      sfield = source.system.schema.getField(path);
      if (ifield && sfield) {
        const value = Math.ceil(foundry.utils.getProperty(source.system, path) / 2);
        if (value) changes.push({key: `system.${path}`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: String(value)});
      }

      // Half the source item's weight is added.
      path = "weight.value";
      ifield = item.system.schema.getField(path);
      sfield = source.system.schema.getField(path);
      if (ifield && sfield) {
        const value = Math.ceil(foundry.utils.getProperty(source.system, path) / 2);
        if (value) changes.push({key: `system.${path}`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: String(value)});
      }

      // Use the highest of the items' wielding (one- or two-handed).
      path = "wield.value";
      ifield = item.system.schema.getField(path);
      sfield = source.system.schema.getField(path);
      if (ifield && sfield) {
        const valueA = foundry.utils.getProperty(source.system, path);
        const valueB = foundry.utils.getProperty(item.system, path);
        const value = Math.max(valueA, valueB);
        if (value > 1) changes.push({key: `system.${path}`, mode: CONST.ACTIVE_EFFECT_MODES.UPGRADE, value: String(value)});
      }

      // Half the source item's reach is added.
      path = "range.reach";
      ifield = item.system.schema.getField(path);
      sfield = source.system.schema.getField(path);
      if (ifield && sfield && item.isMelee && source.isMelee) {
        const value = Math.ceil(foundry.utils.getProperty(source.system, path) / 2);
        if (value) changes.push({key: `system.${path}`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: String(value)});
      }

      // Half the source item's action point cost is added.
      path = "cost.value";
      ifield = item.system.schema.getField(path);
      sfield = source.system.schema.getField(path);
      if (ifield && sfield) {
        const value = Math.ceil(foundry.utils.getProperty(source.system, path) / 2);
        if (value) changes.push({key: `system.${path}`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: String(value)});
      }

      // Half the source item's armor value is added.
      path = "armor.value";
      ifield = item.system.schema.getField(path);
      sfield = source.system.schema.getField(path);
      if (ifield && sfield) {
        const value = Math.ceil(foundry.utils.getProperty(source.system, path) / 2);
        if (value) changes.push({key: `system.${path}`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: String(value)});
      }

      // Half the source item's damage bonuses are added.
      path = "damage.bonuses";
      ifield = item.system.schema.getField(path);
      sfield = source.system.schema.getField(path);
      if (ifield && sfield) {
        for (const field of sfield) {
          const valueField = field.fields.value;
          const value = Math.ceil(foundry.utils.getProperty(source, valueField.fieldPath) / 2);
          if (value) changes.push({key: valueField.fieldPath, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: String(value)});
        }
      }

      // Merge the targeting types of offensive spells.
      path = "template.types";
      ifield = item.system.schema.getField(path);
      sfield = source.system.schema.getField(path);
      if (ifield && sfield && source.hasTemplate) {
        const value = Array.from(foundry.utils.getProperty(source.system, path)).join(", ");
        if (value) changes.push({key: `system.${path}`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: value});
      }

      // Half the source item's resistances are added.
      path = "resistances";
      ifield = item.system.schema.getField(path);
      sfield = source.system.schema.getField(path);
      if (ifield && sfield && item.isArmor && source.isArmor) {
        for (const field of sfield) {
          const valueField = field.fields.value;
          const value = Math.ceil(foundry.utils.getProperty(source, valueField.fieldPath) / 2);
          if (value) changes.push({key: valueField.fieldPath, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: String(value)});
        }
      }

      // Any valid changes from the effect are added as well.
      for (const change of effect.changes) {
        if (this.constructor.BONUS_FIELDS.has(change.key)) changes.push({...change});
      }

      return changes;
    }

    /**
     * Construct an array of changes that will be applying to this item if a given fusion
     * effect is chosen from its source item.
     * @param {ActiveEffectArtichron} effect      The selected effect.
     * @returns {object[]}                        An array of objects, each with path, label, and the old and new values.
     */
    createFusionTranslation(effect) {
      const source = effect.parent;
      const changes = this.createFusionData(effect);

      const clone = this.parent.clone();
      clone.applyActiveEffects(); // unsure why this is needed.
      const update = [];
      for (const change of changes) {
        const path = change.key;
        const field = path.startsWith("system.") ?
          source.system.schema.getField(path.slice(7)) :
          source.schema.getField(path);
        const newValue = getDocumentClass("ActiveEffect").applyField(clone, change, field);
        update.push({
          oldValue: foundry.utils.getProperty(this.parent, path) ?? 0,
          newValue: newValue,
          label: field.label || path,
          path: path
        });
      }
      return update;
    }

    /* -------------------------------------------------- */
    /*   Properties                                       */
    /* -------------------------------------------------- */

    /**
     * Does this item have any valid fusions it can apply?
     * @type {boolean}
     */
    get hasFusions() {
      return this.parent.effects.some(effect => effect.isTransferrableFusion);
    }

    /* -------------------------------------------------- */

    /**
     * Is this item currently under the effect of a fusion?
     * @type {boolean}
     */
    get isFused() {
      return this.parent.effects.some(effect => effect.isActiveFusion);
    }
  };
};
