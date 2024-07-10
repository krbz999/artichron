export default class InventoryItemElement extends HTMLElement {
  /**
   * Factory method for handlebar helper.
   */
  static create(config) {
    const element = new this();
    const item = config.item;

    if (config.expanded && config.enriched) {
      element.dataset.expanded = true;
      element.dataset.enriched = config.enriched;
      element.classList.add("expanded");
    }
    if ((config.uses !== false) && item.hasUses) {
      element.dataset.hasUses = true;
      element.dataset.usesValue = item.system.usage.value;
      element.dataset.usesMax = item.system.usage.max;
    }
    element.dataset.img = item.img;
    element.dataset.name = item.name;
    if (config.favorite !== false) element.dataset.isFavorite = item.isFavorite;
    element.dataset.itemUuid = item.uuid;
    element.dataset.itemId = item.id;
    if ("quantity" in item.system) {
      element.dataset.hasQuantity = true;
      element.dataset.quantity = item.system.quantity.value;
    }
    if (config.disabled) element.dataset.disabled = true;
    if ((config.fusion !== false) && item.hasFusions && !item.isFused) element.dataset.fusion = true;

    if (config.price) {
      element.dataset.price = item.system.price.value;
    }

    if (config.actions !== false) element.dataset.actions = true;

    for (const [k, v] of Object.entries(config.dataset ?? {})) {
      element.dataset[k] = v;
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
    // Img and name.
    const anchor = document.createElement("A");
    anchor.classList.add("wrapper");
    anchor.setAttribute("draggable", "true");
    anchor.dataset.action = "toggleDescription";

    const img = document.createElement("IMG");
    img.src = this.dataset.img;
    if (this.dataset.actions) img.dataset.action = "useItem";

    img.alt = this.dataset.name;
    img.classList.add("image");

    const label = document.createElement("LABEL");
    label.classList.add("name");
    label.textContent = this.dataset.name;

    anchor.insertAdjacentElement("beforeend", img);
    anchor.insertAdjacentElement("beforeend", label);
    this.insertAdjacentElement("beforeend", anchor);

    // Uses.
    if (this.dataset.hasUses) {
      const property = document.createElement("DIV");
      property.classList.add("property", "usage");

      const counter = document.createElement("DIV");
      counter.classList.add("counter");
      property.insertAdjacentElement("beforeend", counter);

      const input = document.createElement("INPUT");
      input.type = "text";
      input.classList.add("delta");
      input.id = `usage-${this.dataset.itemId}`;
      input.value = this.dataset.usesValue;
      if (this.dataset.actions) input.dataset.action = "updateEmbedded";
      input.dataset.property = "system.usage.value";
      input.placeholder = "0";
      input.setAttribute("max", String(this.dataset.usesMax));
      counter.insertAdjacentElement("beforeend", input);

      counter.insertAdjacentHTML("beforeend", `
        <span class="sep">/</span>
        <span class="max">${this.dataset.usesMax}</span>`
      );

      const label = document.createElement("SPAN");
      label.classList.add("label");
      label.textContent = game.i18n.localize("ARTICHRON.ItemProperty.Usage.Value");
      property.insertAdjacentElement("beforeend", label);

      this.insertAdjacentElement("beforeend", property);
    }

    // Quantity.
    if (this.dataset.hasQuantity) {
      const property = document.createElement("DIV");
      property.classList.add("property", "quantity");

      const counter = document.createElement("DIV");
      counter.classList.add("counter");
      property.insertAdjacentElement("beforeend", counter);

      const input = document.createElement("INPUT");
      input.type = "text";
      input.classList.add("delta");
      input.id = `quantity-${this.dataset.itemId}`;
      input.value = this.dataset.quantity;
      if (this.dataset.actions) input.dataset.action = "updateEmbedded";
      input.dataset.property = "system.quantity.value";
      input.placeholder = "0";
      counter.insertAdjacentElement("beforeend", input);

      const label = document.createElement("SPAN");
      label.classList.add("label");
      label.textContent = game.i18n.localize("ARTICHRON.ItemProperty.Quantity.Value");
      property.insertAdjacentElement("beforeend", label);

      this.insertAdjacentElement("beforeend", property);
    }

    // Price.
    if (this.dataset.price) {
      const property = document.createElement("DIV");
      property.classList.add("property", "price");
      const counter = document.createElement("DIV");
      counter.classList.add("counter");
      property.insertAdjacentElement("beforeend", counter);
      const span = document.createElement("SPAN");
      span.textContent = this.dataset.price;
      counter.insertAdjacentElement("beforeend", span);
      const label = document.createElement("SPAN");
      label.classList.add("label");
      label.textContent = game.i18n.localize("ARTICHRON.ItemProperty.Price.Value");
      property.insertAdjacentElement("beforeend", label);
      this.insertAdjacentElement("beforeend", property);
    }

    // Fusion.
    if (this.dataset.fusion) {
      const div = document.createElement("DIV");
      div.classList.add("property", "fusion");
      const a = document.createElement("A");
      if (this.dataset.actions) a.dataset.action = "fuseItem";
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

    if (["true", "false"].includes(this.dataset.isFavorite)) {
      const fav = document.createElement("A");
      fav.classList.add("control");
      fav.innerHTML = `<i class="${(this.dataset.isFavorite === "true") ? "fa-solid" : "fa-regular"} fa-star"></i>`;
      if (this.dataset.actions) fav.dataset.action = "favoriteItem";
      controls.insertAdjacentElement("beforeend", fav);
    }

    if (!this.dataset.disabled) {
      const edit = document.createElement("A");
      edit.classList.add("control");
      edit.innerHTML = "<i class='fa-solid fa-edit'></i>";
      if (this.dataset.actions) edit.dataset.action = "editItem";
      controls.insertAdjacentElement("beforeend", edit);

      const trash = document.createElement("A");
      trash.classList.add("control");
      trash.innerHTML = "<i class='fa-solid fa-trash'></i>";
      if (this.dataset.actions) trash.dataset.action = "deleteItem";
      controls.insertAdjacentElement("beforeend", trash);
    }

    this.insertAdjacentElement("beforeend", controls);

    const wrapper = document.createElement("DIV");
    wrapper.classList.add("description-wrapper");
    if (this.dataset.expanded && this.dataset.enriched) {
      wrapper.innerHTML = `<div class="description">${this.dataset.enriched}</div>`;
    }
    this.insertAdjacentElement("beforeend", wrapper);

    // TODO: cleanup if #11407 gets in.
    delete this.dataset.itemId;
    delete this.dataset.img;
    // delete this.dataset.name; // intentionally not deleted, needed for search filter
    delete this.dataset.hasUses;
    delete this.dataset.usesValue;
    delete this.dataset.usesMax;
    delete this.dataset.hasQuantity;
    delete this.dataset.quantity;
    delete this.dataset.isFavorite;
    delete this.dataset.expanded;
    delete this.dataset.enriched;
    delete this.dataset.disabled;
    delete this.dataset.fusion;
    delete this.dataset.price;
    delete this.dataset.actions;
  }
}
