export default class ActorDirectoryArtichron extends foundry.applications.sidebar.tabs.ActorDirectory {
  /** @inheritdoc */
  _getEntryContextOptions() {
    const options = super._getEntryContextOptions();
    options.push({
      name: "ARTICHRON.ContextMenu.Directory.AssignPrimaryParty",
      icon: "<i class='fa-solid fa-fw fa-medal'></i>",
      condition: (li) => {
        const actor = game.actors.get(li.dataset.entryId);
        return game.user.isGM && (actor.type === "party") && (actor !== game.actors.party);
      },
      callback: (li) => game.settings.set("artichron", "primaryParty", { actor: game.actors.get(li.dataset.entryId) }),
      group: "system",
    }, {
      name: "ARTICHRON.ContextMenu.Directory.RemovePrimaryParty",
      icon: "<i class='fa-solid fa-fw fa-times'></i>",
      condition: (li) => {
        const actor = game.actors.get(li.dataset.entryId);
        return game.user.isGM && (actor === game.actors.party);
      },
      callback: (li) => game.settings.set("artichron", "primaryParty", { actor: null }),
      group: "system",
    });
    return options;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender(context, options);

    const party = game.actors.party;
    if (!party) return;
    const element = this.element.querySelector(`[data-entry-id="${party.id}"]`);
    if (element) element.classList.add("primary-party");
  }
}
