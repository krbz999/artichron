const {NumberField, SchemaField} = foundry.data.fields;

export const FusionTemplateMixin = Base => {
  return class FusionTemplate extends Base {
    /** @override */
    static defineSchema() {
      const schema = super.defineSchema();
      schema.fusion = new SchemaField({
        max: new NumberField({
          integer: true,
          min: 0,
          initial: 1,
          label: "ARTICHRON.ItemProperty.Fusion.Max",
          hint: "ARTICHRON.ItemProperty.Fusion.MaxHint"
        })
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

      // Arsenal items always carry over their attributes.
      if (this.parent.isArsenal) {
        const value = Array.from(this.parent.system.attributes.value).map(a => `"${a}"`).join(", ");
        effectData.changes.push({
          key: "system.attributes.value",
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: `[${value}]`
        });
      }

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
     * Create fusion data using a source item with the target being this item.
     * @param {ItemArtichron} source      The source item that will be fused onto this item.
     * @returns {object[]}                An array of effect change data.
     */
    createFusionData(source) {
      const item = this.parent;
      const changes = [];

      // Attributes are merged.
      let path = "attributes.value";
      let ifield = item.system.schema.getField(path);
      let sfield = source.system.schema.getField(path);
      if (ifield && sfield) {
        const svalue = foundry.utils.getProperty(source.system, path);
        const ivalue = foundry.utils.getProperty(item.system, path);
        const value = Array.from(svalue).join(", ");
        changes.push({key: `system.${path}`, mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: value});
      }

      return changes;
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
