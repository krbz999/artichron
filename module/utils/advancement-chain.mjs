/**
 * Utility class for advancement chains.
 * @extends {import("../_types").AdvancementChainLink}
 */
export default class AdvancementChain {
  constructor(chainLink) {
    Object.assign(this, chainLink);
  }

  /* -------------------------------------------------- */

  /**
   * Iterating over a chain should yield itself and any children and their children.
   * @yields {AdvancementChain}
   */
  *[Symbol.iterator]() {

    function* yielder(node) {
      yield node;
      for (const k in node.choices) {
        for (const u in node.choices[k].children)
          yield * yielder(node.choices[k].children[u]);
      }
    }

    for (const c of yielder(this)) yield c;
  }

  /* -------------------------------------------------- */

  /**
   * Iterate through the nodes of the chain, but dismiss any children whose "parent" item
   * were explicitly not deselected. This can be used to determine which advancements in the
   * full chain of possibilities are currently active and valid.
   * @yields {AdvancementChain}
   */
  *active() {
    function* yielder(node) {
      yield node;
      for (const k in node.choices) {
        const isSelected = !node.isChoice || !!node.selected[k];
        if (!isSelected) continue;
        for (const u in node.choices[k].children)
          yield * yielder(node.choices[k].children[u]);
      }
    }

    for (const c of yielder(this)) yield c;
  }

  /* -------------------------------------------------- */

  /**
   * Set an item as selected or not selected.
   * @param {string} advancementUuid    The uuid of the advancement that granted the item.
   * @param {string} itemUuid           The uuid of the item that is granted by the advancement.
   * @param {boolean} [selected=true]   Whether the item is set as selected or not.
   * @returns {boolean}                 Whether a change was made.
   */
  selectItem(advancementUuid, itemUuid, selected = true) {
    let success = false;
    selected = !!selected;

    for (const node of this)
      if (node.advancement.uuid === advancementUuid)
        if (node.choices[itemUuid]) {
          const has = node.selected[itemUuid] ?? false;
          if (selected !== has) success = true;
          node.selected[itemUuid] = selected;
        }

    return success;
  }

  /* -------------------------------------------------- */

  getByAdvancement(uuid) {
    for (const node of this) if (node.advancement.uuid === uuid) return node;
    return null;
  }

  /* -------------------------------------------------- */
  /*   Factory Methods                                  */
  /* -------------------------------------------------- */

  static async create(advancement, parent = null, _depth = 0) {
    if (advancement instanceof foundry.documents.Item) {
      const chains = [];
      for (const adv of advancement.getEmbeddedPseudoDocumentCollection("Advancement")) {
        const chain = await this.create(adv);
        chains.push(chain);
      }
      return chains;
    }

    const nodeData = {
      advancement, parent,
      depth: _depth,
      isRoot: !_depth,
      choices: {},
      selected: {},
    };

    const node = new this(nodeData);

    if (advancement.type === "itemGrant") {
      for (const { uuid } of advancement.pool) {
        const item = await fromUuid(uuid);
        if (!item) continue;

        const choice = node.choices[item.uuid] = {
          item, node,
          itemLink: item.toAnchor(),
          children: {},
        };

        Object.defineProperty(choice, "isChosen", {
          get() {
            if (!node.isChosen) return false;
            if (!node.isChoice) return true;
            return node.selected[item.uuid] === true;
          },
        });

        if (!item.supportsAdvancements) continue;

        // Find any "child" advancements.
        for (const advancement of item.getEmbeddedPseudoDocumentCollection("Advancement")) {
          choice.children[advancement.uuid] = await AdvancementChain.create(advancement, node, _depth + 1);
          choice.children[advancement.uuid].parentChoice = choice; // Helps detect if chosen.
        }
      }
    } else if (advancement.type === "trait") {
      // This whole section is just a test.
      for (const k of Object.keys(advancement.traits)) {
        const choice = node.choices[k] = {
          node,
          trait: k,
          children: {},
        };

        Object.defineProperty(choice, "isChosen", {
          get() {
            if (!node.isChosen) return false;
            if (!node.isChoice) return true;
            return node.selected[k] === true;
          },
        });
      }
    }

    return node;
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * Is there a choice to make or do you just get everything?
   * @type {boolean}
   */
  get isChoice() {
    switch (this.advancement.type) {
      case "trait":
      case "itemGrant":
        // If chooseN is null, there is no choice to make; you get all.
        return this.chooseN !== null;
      default: return false;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Validated number of choices to make. If this feasibly cannot be a choice of multiple options,
   * with some choices remaining leftover, this returns `null`. It otherwise returns the number of
   * choices the user can make.
   * @type {number|null}
   */
  get chooseN() {
    switch (this.advancement.type) {
      case "trait":
      case "itemGrant": {
        if (this.advancement.chooseN === null) return null;
        if (this.advancement.chooseN >= Object.values(this.choices).length) return null;
        return this.advancement.chooseN;
      }
    }
    return null;
  }

  /* -------------------------------------------------- */

  /**
   * Is this advancement chosen and valid? I.e. if confirming, should it be applied?
   * It's either an advancement in the root, which are always applied, or it's from
   * an item granted by a "parent" item grant, in which case we check the "parent choice"
   * to see if *that* was chosen. This should recursively check up the chain until it
   * either finds the root, or a node that was not chosen or did not pick the relevant item.
   *
   * This should never be relevant for anything but root nodes or child nodes from item grants.
   * @type {boolean}
   */
  get isChosen() {
    if (this.isRoot) return true;
    return this.parentChoice.isChosen;
  }

  /* -------------------------------------------------- */

  /**
   * Is this node fully configured, all choices made?
   * @type {boolean}
   */
  get isConfigured() {
    if (!this.isChoice) return true;
    const selected = Object.values(this.selected).reduce((acc, b) => acc + Boolean(b), 0);
    return selected === this.chooseN;
  }
}
