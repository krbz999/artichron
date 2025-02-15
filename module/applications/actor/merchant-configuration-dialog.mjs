/**
 * Application for configuring the basic data of a merchant.
 */
export default class MerchantConfigurationDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.DocumentSheetV2,
) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron"],
    window: {
      icon: "fa-solid fa-medal",
      contentClasses: ["standard-form"],
    },
    position: {
      width: 500,
      height: "auto",
    },
    form: {
      submitOnChange: true,
    },
  };

  /* -------------------------------------------------- */

  /** @override */
  static PARTS = {
    form: {
      template: "systems/artichron/templates/actor/merchant-configuration-dialog.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.format("ARTICHRON.MerchantConfigurationDialog.Title", { name: this.document.name });
  }

  /* -------------------------------------------------- */
  /*   Rendering                                        */
  /* -------------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = {};

    context.name = {
      field: this.document.schema.getField("name"),
      value: this.document.name,
      label: game.i18n.localize("Name"),
    };
    context.img = {
      field: this.document.schema.getField("img"),
      value: this.document.img,
      label: game.i18n.localize("Image"),
    };
    context.bio = {
      field: this.document.system.schema.getField("biography.value"),
      value: this.document.system.biography.value,
      enriched: await TextEditor.enrichHTML(this.document.system.biography.value, {
        rollData: this.document.getRollData(), relativeTo: this.document,
      }),
    };
    context.shop = {
      field: this.document.system.schema.getField("shop"),
      value: this.document.system.shop,
    };

    return context;
  }
}
