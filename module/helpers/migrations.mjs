export async function refreshCompendium(pack) {
  const dpb = (value, max) => {
    const pct = Math.floor(value / max * 100);
    SceneNavigation.displayProgressBar({ pct: pct, label: `Migrating ${pack.metadata.label}...` });
  };

  const size = pack.index.size;
  await pack.configure({ locked: false });
  dpb(0);
  const documents = await pack.getDocuments();
  for (const [i, document] of documents.entries()) {
    try {
      await document.delete();
      const operation = { pack: pack.metadata.id, keepId: true };
      await foundry.utils.getDocumentClass(pack.metadata.type).create(document.toObject(), operation);
    } catch (err) {
      console.warn(err);
    }
    dpb(i + 1, size);
  }
  await pack.configure({ locked: true });
  return true;
}

export async function refreshSystemCompendiums() {
  for (const { id } of game.system.packs) {
    await new Promise(r => setTimeout(r, 1000));
    const pack = game.packs.get(id);
    await refreshCompendium(pack);
  }
}
