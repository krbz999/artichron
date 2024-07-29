const enrichedCache = new Map();

export default class InventoryItemElement extends HTMLElement {
  /**
   * Factory method for handlebar helper.
   */
  static create(config) {
    const element = new this();
    const item = config.item;
    if (item) {
      element.dataset.itemUuid = item.uuid;
      element.dataset.itemId = item.id;
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
   * The tag name of this element.
   * @type {string}
   */
  static tagName = "inventory-item";

  /* -------------------------------------------------- */
  /*   Event listeners                                  */
  /* -------------------------------------------------- */

  /** @override */
  connectedCallback() {
    const application = foundry.applications.instances.get(this.closest(".application").id);
    const item = application.document.items.get(this.dataset.itemId);
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
    if (!limited) {
      img.dataset.action = "useItem";
      const playButton = document.createElement("SPAN");
      playButton.classList.add("use");
      playButton.insertAdjacentHTML("beforeend", "<i class='fa-solid fa-circle-play'></i>");
      img.insertAdjacentElement("beforeend", playButton);
    }
    this.insertAdjacentElement("beforeend", img);

    const isCompact = this.closest(".inventory-list").classList.contains("compact");

    if (!isCompact) {
      // Name.
      const anchor = document.createElement("A");
      anchor.classList.add("wrapper");
      anchor.setAttribute("draggable", "true");
      anchor.dataset.action = "toggleDescription";

      const label = document.createElement("LABEL");
      label.classList.add("name");
      label.textContent = item.name;

      anchor.insertAdjacentElement("beforeend", label);
      this.insertAdjacentElement("beforeend", anchor);

      // Uses.
      if (item.system.schema.has("usage")) {
        const property = document.createElement("DIV");
        property.classList.add("property", "usage");

        const counter = document.createElement("DIV");
        counter.classList.add("counter");
        property.insertAdjacentElement("beforeend", counter);

        const input = document.createElement("INPUT");
        input.type = "text";
        input.classList.add("delta");
        input.id = `usage-${item.id}`;
        input.value = item.system.usage.value;
        if (!limited) input.dataset.action = "updateEmbedded";
        else input.disabled = true;
        input.dataset.property = "system.usage.value";
        input.placeholder = "0";
        input.setAttribute("max", String(item.system.usage.max));
        counter.insertAdjacentElement("beforeend", input);

        counter.insertAdjacentHTML("beforeend", `
          <span class="sep">/</span>
          <span class="max">${item.system.usage.max}</span>`
        );

        const label = document.createElement("SPAN");
        label.classList.add("label");
        label.textContent = game.i18n.localize("ARTICHRON.ItemProperty.FIELDS.usage.label");
        property.insertAdjacentElement("beforeend", label);

        this.insertAdjacentElement("beforeend", property);
      }

      // Quantity.
      if (item.system.schema.has("quantity")) {
        const property = document.createElement("DIV");
        property.classList.add("property", "quantity");

        const counter = document.createElement("DIV");
        counter.classList.add("counter");
        property.insertAdjacentElement("beforeend", counter);

        const input = document.createElement("INPUT");
        input.type = "text";
        input.classList.add("delta");
        input.id = `quantity-${item.id}`;
        input.value = item.system.quantity.value;
        if (!limited) input.dataset.action = "updateEmbedded";
        else input.disabled = true;
        input.dataset.property = "system.quantity.value";
        input.placeholder = "0";
        counter.insertAdjacentElement("beforeend", input);

        const label = document.createElement("SPAN");
        label.classList.add("label");
        label.textContent = game.i18n.localize("ARTICHRON.ItemProperty.FIELDS.quantity.value.label");
        property.insertAdjacentElement("beforeend", label);

        this.insertAdjacentElement("beforeend", property);
      }

      // Fusion.
      if (!limited && item.hasFusions && !item.isFused) {
        const div = document.createElement("DIV");
        div.classList.add("property", "fusion");
        const a = document.createElement("A");
        a.dataset.action = "fuseItem";
        a.dataset.tooltip = "ARTICHRON.SheetActions.FuseItem";
        const i = document.createElement("I");
        i.classList.add("fa-solid", "fa-volcano");
        a.insertAdjacentElement("beforeend", i);
        div.insertAdjacentElement("beforeend", a);
        this.insertAdjacentElement("beforeend", div);
      }

      // Controls.
      const controls = document.createElement("DIV");
      controls.classList.add("controls");

      // Favoriting.
      if (!limited) {
        const fav = document.createElement("A");
        fav.classList.add("control");
        fav.innerHTML = `<i class="${item.isFavorite ? "fa-solid" : "fa-regular"} fa-star"></i>`;
        fav.dataset.action = "favoriteItem";
        controls.insertAdjacentElement("beforeend", fav);
      }

      // Editing and deleting.
      if (!limited && editMode) {
        const edit = document.createElement("A");
        edit.classList.add("control");
        edit.innerHTML = "<i class='fa-solid fa-edit'></i>";
        edit.dataset.action = "editItem";
        controls.insertAdjacentElement("beforeend", edit);

        const trash = document.createElement("A");
        trash.classList.add("control");
        trash.innerHTML = "<i class='fa-solid fa-trash'></i>";
        trash.dataset.action = "deleteItem";
        controls.insertAdjacentElement("beforeend", trash);
      }

      this.insertAdjacentElement("beforeend", controls);

      const wrapper = document.createElement("DIV");
      wrapper.classList.add("description-wrapper");
      if (this.classList.contains("expanded") && enriched) {
        wrapper.innerHTML = `<div class="description">${enriched}</div>`;
      }
      this.insertAdjacentElement("beforeend", wrapper);
    }

    else {
      this.dataset.tooltip = `
      <section class="loading" data-uuid="${item.uuid}">
        <i class="fas fa-spinner fa-spin-pulse"></i>
      </section>`;
      this.setAttribute("draggable", "true");
    }

    // Set name for use in search filter.
    this.dataset.name = item.name;
  }
}
