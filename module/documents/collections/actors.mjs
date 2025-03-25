export default class ActorsArtichron extends foundry.documents.collections.Actors {
  /**
   * The primary party.
   * @type {ActorArtichron|null}
   */
  get party() {
    return game.settings.get(game.system.id, "primaryParty")?.actor ?? null;
  }
}
