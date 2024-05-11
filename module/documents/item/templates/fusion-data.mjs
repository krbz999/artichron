export const FusionTemplateMixin = (Base) => {
  return class FusionTemplate extends Base {
    /* -------------------------- */
    /*           Fusion           */
    /* -------------------------- */

    /**
     * Pick one of the fusion options of this item, grant it to a target item, and destroy this.
     * @param {ItemArtichron} target      The target item.
     * @returns {Promise<ActiveEffectArtichron|null>}
     */
    async fuse(target) {
      if (this.isFused) {
        ui.notifications.warn("ARTICHRON.Warning.Fusion.Recursion", {localize: true});
        return null;
      }

      const effects = this.parent.effects.filter(effect => effect.transferrableFusion);
      if (!effects.length) {
        ui.notifications.warn("ARTICHRON.Warning.Fusion.NoneAvailable", {localize: true});
        return null;
      }

      if (!(target instanceof Item)) {
        ui.notifications.warn("ARTICHRON.Warning.Fusion.TargetNotItem", {localize: true});
        return null;
      }

      if (!target.isOwner || !this.parent.isOwner) {
        ui.notifications.warn("ARTICHRON.Warning.Fusion.NotOwner", {localize: true});
        return null;
      }

      const choices = effects.reduce((acc, e) => {
        acc[e.id] = e.name;
        return acc;
      }, {});
      const field = new foundry.data.fields.StringField({
        choices: choices,
        label: "ARTICHRON.FusionDialog.Select",
        initial: effects[0].id
      });
      const content = HandlebarsHelpers.formField(field, {hash: {
        localize: true,
        value: "",
        name: "effectId",
        sort: true,
        blank: false
      }});
      const effectId = await foundry.applications.api.DialogV2.prompt({
        window: {
          title: game.i18n.format("ARTICHRON.FusionDialog.FuseTitle", {
            source: this.parent.name,
            target: target.name
          }),
          icon: "fa-solid fa-volcano"
        },
        position: {width: 400},
        content: content,
        rejectClose: false,
        ok: {
          icon: "fa-solid fa-bolt",
          label: "ARTICHRON.FusionDialog.Confirm",
          callback: (event, button, dialog) => button.form.elements.effectId.value
        }
      });
      if (!effectId) return null;

      const effect = this.parent.effects.get(effectId).clone();
      effect.updateSource({"system.itemData": game.items.fromCompendium(this.parent, {
        clearFolder: true, keepId: true
      })});

      await this.parent.delete();
      return getDocumentClass("ActiveEffect").create(effect.toObject(), {parent: target});
    }

    /**
     * Prompt a dialog to pick a valid fusion target, then pass the selection off to the 'fuse' method.
     * @returns {Promise<ActiveEffectArtichron|null>}
     */
    async fuseDialog() {
      const targets = this.parent.actor.items.filter(item => {
        return (item !== this.parent) && (item.type === this.parent.type) && !item.isFused;
      });

      if (!targets.length) {
        ui.notifications.warn("ARTICHRON.Warning.Fusion.NoneAvailable", {localize: true});
        return null;
      }

      const choices = targets.reduce((acc, e) => {
        acc[e.id] = e.name;
        return acc;
      }, {});
      const field = new foundry.data.fields.StringField({
        choices: choices,
        label: "ARTICHRON.FusionTargetDialog.Select",
        initial: targets[0].id
      });
      const content = HandlebarsHelpers.formField(field, {hash: {
        localize: true,
        value: "",
        name: "itemId",
        sort: true,
        blank: false
      }});
      const itemId = await foundry.applications.api.DialogV2.prompt({
        window: {
          title: game.i18n.format("ARTICHRON.FusionTargetDialog.Title", {
            source: this.parent.name,
            target: "target.name"
          }),
          icon: "fa-solid fa-volcano"
        },
        position: {width: 400},
        content: content,
        rejectClose: false,
        ok: {
          icon: "fa-solid fa-bolt",
          label: "ARTICHRON.FusionTargetDialog.Confirm",
          callback: (event, button, dialog) => button.form.elements.itemId.value
        }
      });
      if (!itemId) return null;

      const target = this.parent.actor.items.get(itemId);
      return this.fuse(target);
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
