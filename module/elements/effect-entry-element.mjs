const enrichedCache = new Map();

export default class EffectEntryElement extends HTMLElement {
  /**
   * Factory method for handlebar helper.
   */
  static create(config) {
    const element = new this();
    const item = config.effect;
    if (item) {
      element.dataset.itemUuid = item.uuid;
      element.dataset.itemId = item.id;
      element.dataset.parentId = item.parent.id;
      if (config.enriched) {
        enrichedCache.set(item.uuid, config.enriched);
        element.classList.add("expanded");
      } else {
        enrichedCache.delete(item.uuid);
      }
    }
    return element;
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The active effect.
   * @type {ActiveEffect|null}
   */
  #item = null;
  get item() {
    return this.#item;
  }

  /* -------------------------------------------------- */

  /**
   * The tag name of this element.
   * @type {string}
   */
  static tagName = "effect-entry";

  /* -------------------------------------------------- */
  /*   Event listeners                                  */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  connectedCallback() {
    const application = foundry.applications.instances.get(this.closest(".application").id);

    const item = (this.dataset.parentId !== application.document.id) ?
      application.document.items.get(this.dataset.parentId).effects.get(this.dataset.itemId) :
      application.document.effects.get(this.dataset.itemId);

    const enriched = enrichedCache.get(item?.uuid);
    const limited = !application.isEditable;
    const editMode = application.isEditMode;

    if (!item) return;

    // Image.
    const img = document.createElement("A");
    const image = document.createElement("IMG");
    image.src = item.img;
    image.alt = item.name;
    img.classList.add("image");
    img.insertAdjacentElement("beforeend", image);
    if (!limited) img.dataset.action = "toggleEffect";
    image.style.opacity = item.disabled ? 0.25 : 1;
    this.insertAdjacentElement("beforeend", img);

    // Name.
    const anchor = document.createElement("A");
    anchor.classList.add("wrapper");
    anchor.setAttribute("draggable", "true");
    anchor.dataset.action = "toggleDescription";

    const label = document.createElement("LABEL");
    label.classList.add("name", "stacked");

    // Label and subtitle.
    label.insertAdjacentHTML("beforeend", `<span class="title">${item.name}</span>`);
    if (item.system.schema.has("level") && Number.isNumeric(item.system.level)) {
      label.insertAdjacentHTML("beforeend", `
      <span class="subtitle">
        ${game.i18n.format("ARTICHRON.SheetLabels.Level", { level: item.system.level })}
      </span>`,
      );
    } else if (item.parent !== application.document) {
      label.insertAdjacentHTML("beforeend", `<span class="subtitle">${item.parent.name}</span>`);
    }

    anchor.insertAdjacentElement("beforeend", label);
    this.insertAdjacentElement("beforeend", anchor);

    // If this is an active fusion on an item sheet, display undoFusion control and the source.
    if (item.isActiveFusion) {
      const a = document.createElement("A");
      a.dataset.action = "undoFusion";
      a.dataset.tooltip = "ARTICHRON.SheetLabels.ActiveFusion";
      a.insertAdjacentHTML("beforeend", `
        <i class="fa-solid fa-volcano"></i>
        <i class="fa-solid fa-recycle"></i>`,
      );
      this.insertAdjacentElement("beforeend", a);

      const div = document.createElement("DIV");
      div.classList.add("property", "source");
      div.insertAdjacentHTML("beforeend", `<span class="label">${item.system.itemData?.name}</span>`);

      this.insertAdjacentElement("beforeend", div);
    }

    // If this is a buff, display its origin.
    else if ((item.type === "buff") && item.system.source) {
      try {
        const source = fromUuidSync(item.system.source);
        const sourceActor = source?.parent?.name ?? "";
        const sourceItem = source?.name ?? "";

        const div = document.createElement("DIV");
        div.classList.add("property", "source");
        div.insertAdjacentHTML("beforeend", `
          <span class="origin">${sourceItem}</span>
          <span class="label">${sourceActor}</span>`,
        );
        this.insertAdjacentElement("beforeend", div);
      } catch (err) {/** */}
    } else {
      const div = document.createElement("DIV");
      div.classList.add("property", "source");
      this.insertAdjacentElement("beforeend", div);
    }

    // Controls.
    const controls = document.createElement("DIV");
    controls.classList.add("controls");

    // Editing and deleting.
    if (!limited && editMode) {
      const edit = document.createElement("A");
      edit.classList.add("control");
      edit.innerHTML = "<i class='fa-solid fa-edit'></i>";
      edit.dataset.action = "editEffect";
      controls.insertAdjacentElement("beforeend", edit);

      const trash = document.createElement("A");
      trash.classList.add("control");
      trash.innerHTML = "<i class='fa-solid fa-trash'></i>";
      trash.dataset.action = "deleteEffect";
      controls.insertAdjacentElement("beforeend", trash);
    }

    this.insertAdjacentElement("beforeend", controls);

    const wrapper = document.createElement("DIV");
    wrapper.classList.add("description-wrapper");
    if (this.classList.contains("expanded") && enriched) {
      wrapper.innerHTML = `<div class="description">${enriched}</div>`;
    }
    this.insertAdjacentElement("beforeend", wrapper);

    // Set name for use in search filter.
    this.dataset.name = item.name;

    this.#item = item;
  }
}
