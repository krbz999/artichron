export default class ChatMessageSystemModel extends foundry.abstract.TypeDataModel {
  /**
   * Make system-specific adjustments to the chat message when created by an item.
   * @param {HTMLElement} html      The default html.
   */
  async adjustHTML(html) {
    html.classList.add("artichron", this.parent.type);
  }

  /* -------------------------------------------------- */

  /**
   * Insert an item detail element if this message has an item.
   * @param {HTMLElement} html      The html being modified.
   */
  async _insertItemHeader(html) {
    const item = this.item;
    const activity = item?.system.activities?.get(this.activity);

    if (!item) return;

    const container = document.createElement("DIV");
    container.classList.add("item-details");

    const itemHeader = document.createElement("DIV");
    itemHeader.classList.add("item-header");

    const text = activity ? activity.description : item.system.description.value;

    const enriched = await TextEditor.enrichHTML(text, {
      rollData: this.item.getRollData(), relativeTo: this.item
    });
    itemHeader.innerHTML = `
    <img class="icon" src="${item.img}" alt="${item.name}">
    <div class="details">
      <span class="title">${item.name}</span>
      ${activity ? `<span class="subtitle">${activity.name}</span>` : ""}
    </div>
    ${enriched ? `<div class="description">${enriched}</div>` : ""}`;
    container.insertAdjacentElement("beforeend", itemHeader);

    html.querySelector(".message-content")?.insertAdjacentElement("beforeend", container);
  }
}
