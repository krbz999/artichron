import DocumentConfig from "../../../api/document-config.mjs";

export default class DamageConfig extends DocumentConfig {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    window: {
      title: "ARTICHRON.ATTACK.CONFIG.TITLE",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: "systems/artichron/templates/apps/actor/configs/damage-config/form.hbs",
    },
  };

  /* -------------------------------------------------- */

  /** @type {import("../../../../_types").ContextPartHandler} */
  async _preparePartContextForm(context, options) {
    const ctx = context.ctx = {};
    const damageTypes = artichron.config.DAMAGE_TYPES.optgroups;
    const attackTypes = artichron.config.BASIC_ATTACKS.optgroups;

    Object.assign(ctx, {
      damageTypes, attackTypes,
      damageParts: this.document.getEmbeddedPseudoDocumentCollection("Damage").map(part => {
        return {
          document: part,
          classes: part.isSource ? [] : ["disabled"],
        };
      }),
    });

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);

    // Add context menu for damage parts.
    this._createContextMenu(
      this.#getContextOptionsDamagePart,
      ".document-list.damage .entry",
      { hookName: "DamagePartEntryContext" },
    );
  }

  /* -------------------------------------------------- */

  /**
   * Prepare options for context menus for damage parts.
   * @returns {object[]}
   */
  #getContextOptionsDamagePart() {
    if (!this.document.isOwner) return [];

    return [{
      name: "ARTICHRON.DAMAGE.CONTEXT.PART.render",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      callback: element => this._getPseudoDocument(element).sheet.render({ force: true }),
    }, {
      name: "ARTICHRON.DAMAGE.CONTEXT.PART.delete",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      callback: element => this._getPseudoDocument(element).delete(),
    }];
  }
}
