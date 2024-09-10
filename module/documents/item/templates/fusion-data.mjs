const {NumberField, SchemaField, SetField, StringField} = foundry.data.fields;

const FusionTemplateMixin = Base => {
  return class FusionTemplate extends Base {
    /** @override */
    static defineSchema() {
      const schema = super.defineSchema();
      schema.fusion = new SchemaField({
        ignore: new SetField(new StringField()),
        max: new NumberField({integer: true, min: 0, initial: 1, nullable: false})
      });
      return schema;
    }

    /* -------------------------------------------------- */
    /*   Instance methods                                 */
    /* -------------------------------------------------- */

    /**
     * Pick one of the fusion options of this item, grant it to a target item, and destroy this.
     * @param {ItemArtichron} target                  The target item.
     * @param {ActiveEffectArtichron} [fusion]        The fusion template effect. If omitted, use defaults.
     * @returns {Promise<ActiveEffectArtichron>}      The created fusion effect.
     */
    async fuse(target, fusion) {
      const effect = fusion ? fusion.clone() : new ActiveEffect.implementation({
        type: "fusion",
        name: game.i18n.format("ARTICHRON.ItemFusionDialog.DefaultFusion", {name: this.parent.name}),
        img: this.parent.img
      }, {parent: this.parent});

      effect.updateSource({"system.itemData": game.items.fromCompendium(this.parent, {
        clearFolder: true, keepId: true
      })});

      const effectData = effect.toObject();
      effectData.changes = target.system.createFusionData(effect);

      const created = await getDocumentClass("ActiveEffect").create(effectData, {parent: target});
      await this.parent.delete();
      return created;
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
      const effect = prompt.effectId === "default" ? null : this.parent.effects.get(prompt.effectId);

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
        required: true,
        label: "ARTICHRON.ItemFusionDialog.SplitLabel",
        hint: "ARTICHRON.ItemFusionDialog.SplitHint"
      }).toFormGroup({localize: true}, {name: "effectId"}).outerHTML;
      const id = await foundry.applications.api.DialogV2.prompt({
        rejectClose: false,
        modal: true,
        content: `<fieldset>${field}</fieldset>`,
        ok: {
          label: "ARTICHRON.ItemFusionDialog.Split",
          callback: (event, button, html) => button.form.elements.effectId.value
        },
        window: {
          title: game.i18n.format("ARTICHRON.ItemFusionDialog.TitleUnfuse", {item: this.parent.name}),
          icon: "fa-solid fa-recycle"
        },
        position: {
          width: 400
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
          return CONFIG.SYSTEM.ITEM_ATTRIBUTES[key].transferrable !== false;
        }).join(", ");
        if (value) changes.push({key: `system.${path}`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: value});
      }

      // Half the source item's price is added.
      path = "price.value";
      ifield = item.system.schema.getField(path);
      sfield = source.system.schema.getField(path);
      if (!ignoredChanges.has(path) && ifield && sfield) {
        const value = Math.ceil(foundry.utils.getProperty(source.system, path) / 2);
        if (value) changes.push({key: `system.${path}`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: String(value)});
      }

      // Half the source item's weight is added.
      path = "weight.value";
      ifield = item.system.schema.getField(path);
      sfield = source.system.schema.getField(path);
      if (!ignoredChanges.has(path) && ifield && sfield) {
        const value = Math.ceil(foundry.utils.getProperty(source.system, path) / 2);
        if (value) changes.push({key: `system.${path}`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: String(value)});
      }

      // Use the highest of the items' wielding (one- or two-handed).
      path = "wield.value";
      ifield = item.system.schema.getField(path);
      sfield = source.system.schema.getField(path);
      if (!ignoredChanges.has(path) && ifield && sfield) {
        const valueA = foundry.utils.getProperty(source.system, path);
        const valueB = foundry.utils.getProperty(item.system, path);
        const value = Math.max(valueA, valueB);
        if (value > 1) changes.push({key: `system.${path}`, mode: CONST.ACTIVE_EFFECT_MODES.UPGRADE, value: String(value)});
      }

      // Half the source item's armor value is added.
      path = "armor.value";
      ifield = item.system.schema.getField(path);
      sfield = source.system.schema.getField(path);
      if (!ignoredChanges.has(path) && ifield && sfield) {
        const value = Math.ceil(foundry.utils.getProperty(source.system, path) / 2);
        if (value) changes.push({key: `system.${path}`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: String(value)});
      }

      // Half the source item's resistances are added.
      path = "resistances";
      ifield = item.system.schema.getField(path);
      sfield = source.system.schema.getField(path);
      if (!ignoredChanges.has(path) && ifield && sfield && item.isArmor && source.isArmor) {
        for (const field of sfield) {
          const valueField = field.fields.value;
          const value = Math.ceil(foundry.utils.getProperty(source, valueField.fieldPath) / 2);
          if (value) changes.push({key: valueField.fieldPath, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: String(value)});
        }
      }

      // All activities are added.
      const ignoredActivity = activity => {
        switch (activity.type) {
          case "damage":
            if (item.type !== "spell") return true;
            break;
          case "defend":
            if (!["weapon", "shield"].includes(item.type)) return true;
            break;
          case "effect":
            return true;
          case "healing":
            return true;
          case "teleport":
            if (item.type !== "spell") return true;
            break;
        }
        return false;
      };
      for (const activity of source.system.activities) {
        if (ignoredActivity(activity)) continue;
        const data = activity.toObject();
        data._id = foundry.utils.randomID();
        changes.push({key: "activity", mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: JSON.stringify(data)});
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
        if (!field) continue;
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
     * Can this item be fused onto another?
     * @type {boolean}
     */
    get hasFusions() {
      return this.attributes.value.has("fusion");
    }

    /* -------------------------------------------------- */

    /**
     * Is this item currently under the effect of a fusion?
     * @type {boolean}
     */
    get isFused() {
      return this.parent.effects.some(effect => effect.isActiveFusion);
    }

    /* -------------------------------------------------- */

    /**
     * The set of item properties that this item will modify on the target by default.
     * @type {Set<string>}
     */
    get defaultFusionProperties() {
      const paths = [
        "attributes.value",
        "price.value",
        "weight.value",
        "wield.value",
        "armor.value",
        "resistances"
      ];

      const set = new Set();
      for (const path of paths) {
        const field = this.schema.getField(path);
        if (field) set.add(path);
      }
      return set;
    }
  };
};

export default FusionTemplateMixin;
