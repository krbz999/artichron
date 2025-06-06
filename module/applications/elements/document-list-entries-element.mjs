/**
 * @typedef {object} DocumentEntryConfiguration
 * @property {foundry.abstract.Document|artichron.data.pseudoDocuments.PseudoDocument} document   A document.
 * @property {string[]} [classes]   Additional css classes to add to the entry.
 * @property {string} [parentId]    The id of the document's parent document, in the case of grandchild documents.
 * @property {number} [count]       If numeric, inject a `span` with this value in the bottom left of the image.
 * @property {string} [label]       Use a different label instead of the document name.
 * @property {string} [subtitle]    Use a different subtitle instead of the document subtype.
 * @property {Record<string, string>} [dataset]   Additional [data] properties to insert on the element.
 */

/**
 * @typedef {object} DocumentListEntryConfiguration
 * @property {DocumentEntryConfiguration[]} documents   Configuration for individual document entries.
 * @property {string|string[]} [classes]                Additional css classes to add to this element.
 * @property {string} [action]                          The [data-action] to insert on each document entry. If omitted,
 *                                                      will default to either "renderEmbeddedDocumentSheet" for subclasses
 *                                                      of `document`, or "renderPseudoDocumentSheet" for pseudo-documents.
 */

export default class DocumentListEntriesElement extends HTMLElement {
  /**
   * Factory method.
   * @param {DocumentListEntryConfiguration} config   Element configuration.
   * @returns {DocumentListEntriesElement}            The created element.
   */
  static create(options) {
    const element = new this();

    // CSS classes
    const classes = new Set([
      "document-list-entries",
      ...Array.isArray(options.classes)
        ? options.classes
        : options.classes?.split(" ") ?? [],
    ]);
    for (const cls of classes) {
      element.classList.add(cls);
    }

    // Documents
    for (const documentData of options.documents) {
      const entry = this.#createEntry(documentData);
      entry.dataset.action = options.action
        ? options.action
        : documentData.document instanceof artichron.data.pseudoDocuments.PseudoDocument
          ? "renderPseudoDocumentSheet"
          : "renderEmbeddedDocumentSheet";
      element.insertAdjacentElement("beforeend", entry);
    }

    return element;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static tagName = "document-list-entries";

  /* -------------------------------------------------- */

  /**
   * Create single entry.
   * @param {DocumentEntryConfiguration} data
   * @returns {HTMLDivElement}
   */
  static #createEntry(data) {
    const div = document.createElement("DIV");

    if (!data.document) {
      throw new Error("You must provide [document] to #createEntry.");
    }

    // Base and additional css classes.
    div.classList.add("button", "entry");
    if (data.classes) for (const cls of data.classes) div.classList.add(cls);

    // For pseudo-documents, using a different dataset property.
    const isPseudo = data.document instanceof artichron.data.pseudoDocuments.PseudoDocument;
    if (isPseudo) div.dataset.pseudoId = data.document.id;
    else div.dataset.id = data.document.id;

    // Reference to the parent id in case of grandchild documents.
    if (data.parentId) div.dataset.parentId = data.parentId;

    div.insertAdjacentHTML("beforeend", `<img src="${data.document.img}" alt="${data.document.name}" class="icon">`);

    // Insert counter.
    if (Number.isNumeric(data.count)) {
      div.insertAdjacentHTML("beforeend", `<span class="count">${data.count}</span>`);
    }

    // The label by default is the document name but can be overridden.
    const label = data.label ? data.label : data.document.name;
    div.insertAdjacentHTML("beforeend", `<span class="title">${label}</span>`);

    // The subtitle by default is the document's subtype, but can be overridden.
    const subtitle = data.subtitle
      ? data.subtitle
      : game.i18n.localize(`TYPES.${data.document.documentName}.${data.document.type}`);
    div.insertAdjacentHTML("beforeend", `<span class="subtitle">${subtitle}</span>`);

    // Any additional dataset properties (e.g. `data-name` for search filters).
    for (const [k, v] of Object.entries(data.dataset ?? {})) div.dataset[k] = v;

    // If an item, add tooltip.
    if (data.document.documentName === "Item") {
      div.dataset.tooltipHtml = `
      <section>
        <i class="fa-solid fa-loading loading" data-uuid="${data.document.uuid}"></i>
      </section>`;
    }

    return div;
  }
}
