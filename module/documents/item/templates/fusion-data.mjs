export const FusionTemplateMixin = (Base) => {
  return class FusionTemplate extends Base {
    /* -------------------------- */
    /*           Fusion           */
    /* -------------------------- */

    /**
     * Pick one of the fusion options of this item, grant it to a target item, and destroy this.
     * @param {ItemArtichron} target      The target item.
     * @returns {Promise<[ActiveEffectArtichron, ItemArtichron]>}
     */
    async fuse(target) {
      const effects = this.parent.effects.filter(effect => effect.transferrableFusion);
      if (!effects.length) {
        ui.notifications.warn("ARTICHRON.Warning.NoFusionsAvailable", {localize: true});
        return null;
      }

      if (!(target instanceof Item)) {
        ui.notifications.warn("ARTICHRON.Warning.TargetNotItem", {localize: true});
        return null;
      }

      if (!target.isOwner) {
        ui.notifications.warn("ARTICHRON.Warning.NotOwnerOfFusionTarget", {localize: true});
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

      const effect = this.parent.effects.get(effectId).clone();
      effect.updateSource({"system.itemData": game.items.fromCompendium(this.parent, {
        clearFolder: true, keepId: true
      })});

      await this.parent.delete();
      return getDocumentClass("ActiveEffect").create(effect.toObject(), {parent: target});
    }
  };
};
