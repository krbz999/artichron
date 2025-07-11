import PseudoDocument from "./pseudo-document.mjs";

const { DocumentTypeField } = foundry.data.fields;

export default class TypedPseudoDocument extends PseudoDocument {
  /** @inheritdoc */
  static get metadata() {
    return {
      ...super.metadata,
      types: null,
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      type: new DocumentTypeField(this),
    });
  }

  /* -------------------------------------------------- */

  /**
   * The type of this pseudo-document subclass.
   * @type {string}
   * @abstract
   */
  static get TYPE() {
    return "";
  }

  /* -------------------------------------------------- */

  /**
   * The subtypes of this pseudo-document.
   * @type {Record<string, typeof PseudoDocument>}
   */
  static get TYPES() {
    return Object.values(this.metadata.types).reduce((acc, Cls) => {
      if (Cls.TYPE) acc[Cls.TYPE] = Cls;
      return acc;
    }, {});
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static async create(data = {}, { parent, ...operation } = {}) {
    data = foundry.utils.deepClone(data);

    if (!data.type) data.type = Object.keys(this.TYPES)[0];
    if (!(data.type in this.TYPES)) {
      throw new Error(`The '${data.type}' type is not a valid type for a '${this.metadata.documentName}' pseudo-document!`);
    }

    return super.create(data, { parent, ...operation });
  }

  /* -------------------------------------------------- */

  /**
   * Prompt for picking the subtype of this pseudo-document.
   * @param {object} [data]                                 The data used for the creation.
   * @param {object} operation                              The context of the operation.
   * @param {foundry.abstract.Document} operation.parent    The parent of this document.
   * @returns {Promise<foundry.abstract.Document|null>}     A promise that resolves to the updated document.
   */
  static async createDialog(data = {}, { parent, ...operation } = {}) {
    const select = foundry.applications.fields.createFormGroup({
      label: "Type",
      input: foundry.applications.fields.createSelectInput({
        blank: false,
        name: "type",
        options: Object.keys(this.TYPES).map(type => ({
          value: type,
          label: game.i18n.localize(`TYPES.${this.metadata.documentName}.${type}`),
        })),
      }),
    }).outerHTML;
    const result = await artichron.applications.api.Dialog.input({
      window: {
        title: game.i18n.format("DOCUMENT.New", { type: game.i18n.localize(`DOCUMENT.${this.metadata.documentName}`) }),
      },
      content: `<fieldset>${select}</fieldset>`,
    });
    if (!result) return null;
    return this.create({ ...data, ...result }, { parent, ...operation });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareBaseData() {
    super.prepareBaseData();
    if (!this.name) this.name = game.i18n.localize(`TYPES.${this.constructor.metadata.documentName}.${this.type}`);
  }
}
