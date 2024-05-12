import ItemFusionDialog from "../../../applications/item/fusion-dialog.mjs";

export const FusionTemplateMixin = (Base) => {
  return class FusionTemplate extends Base {
    /* ---------------------------------------- */
    /*                 Fusion                   */
    /* ---------------------------------------- */

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

      await this.parent.delete();
      return getDocumentClass("ActiveEffect").create(effect.toObject(), {parent: target});
    }

    /**
     * Prompt a dialog to pick a valid fusion target and effect, then pass the selection off to the 'fuse' method.
     * @returns {Promise<ActiveEffectArtichron|null>}
     */
    async fuseDialog() {
      const prompt = await ItemFusionDialog.create(this.parent);
      if (!prompt) return null;
      const target = this.parent.actor.items.get(prompt.itemId);
      const effect = this.parent.effects.get(prompt.effectId);
      return this.fuse(target, effect);
    }

    /**
     * Does this item have any valid fusions it can apply?
     * @type {boolean}
     */
    get hasFusions() {
      return this.parent.effects.some(effect => effect.transferrableFusion);
    }

    /**
     * Is this item currently under the effect of a fusion?
     * @type {boolean}
     */
    get isFused() {
      return this.parent.effects.some(effect => effect.isActiveFusion);
    }
  };
};
