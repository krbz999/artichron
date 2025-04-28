export default base => {
  return class ArtichronDocument extends base {
    /** @inheritdoc */
    getEmbeddedDocument(embeddedName, id, { invalid = false, strict = false } = {}) {
      const systemEmbeds = this.system.constructor.metadata.embedded ?? {};
      if (embeddedName in systemEmbeds) {
        const path = systemEmbeds[embeddedName];
        return foundry.utils.getProperty(this, path).get(id, { invalid, strict }) ?? null;
      }
      return super.getEmbeddedDocument(embeddedName, id, { invalid, strict });
    }
  };
};
