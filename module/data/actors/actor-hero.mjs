import CreatureData from "./creature-data.mjs";
import ScalingValue from "./utils/scaling-value.mjs";

const { ArrayField, NumberField, SchemaField, StringField, TypedObjectField } = foundry.data.fields;

/**
 * @typedef SkillData
 * @property {number} number
 * @property {number} faces
 * @property {number} bonus
 */

/**
 * @typedef HeroDataSchema
 * @property {object} progression
 * @property {object} progression.points
 * @property {number} progression.points.value
 * @property {Array<Record<string, number>>} progression.points._investment *
 * @property {object} skills
 * @property {SkillData} skills.agility
 * @property {SkillData} skills.brawn
 * @property {SkillData} skills.mind
 * @property {SkillData} skills.spirit
 */

export default class HeroData extends CreatureData {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      equipped: new SchemaField(Object.keys(artichron.config.EQUIPMENT_TYPES).reduce((acc, key) => {
        acc[key] = new StringField({ required: true });
        return acc;
      }, {})),
      progression: new SchemaField({
        points: new SchemaField({
          value: new NumberField({ min: 0, nullable: false, initial: 0, integer: true }),
          _investment: new ArrayField(new TypedObjectField(
            new NumberField({ min: 1, nullable: false, integer: true }),
            { validateKey: key => key in artichron.config.PROGRESSION_CORE_PATHS },
          )),
        }),
      }),
      skills: new SchemaField(Object.entries(artichron.config.SKILLS).reduce((acc, [k, v]) => {
        acc[k] = new SchemaField({
          number: new NumberField({ integer: true, min: 2, initial: 2, nullable: false }),
          faces: new NumberField({ integer: true, min: 2, initial: 6, nullable: false }),
          bonus: new NumberField({ integer: true, min: 0, initial: 0 }),
        });
        return acc;
      }, {})),
    });
  }

  /* -------------------------------------------------- */
  /*   Preparation methods                              */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareBaseData() {
    super.prepareBaseData();

    // Initialize base defenses.
    this.defenses = {};
    for (const { value } of artichron.config.DAMAGE_TYPES.optgroups) this.defenses[value] = 0;

    this.equipment = Object.fromEntries(Object.keys(artichron.config.EQUIPMENT_TYPES).map(slot => {
      const item = this.parent.items.get(this.equipped[slot]);
      const equipped = item && (item.type === "armor") && (item.system.armor.slot === slot) ? item : null;
      return [slot, equipped];
    }));
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    // Prepare paths. This happens here rather than prepareBaseData due to items' pseudo-documents
    // having to be prepared first, but could be moved to post-prepareEmbeddedDocuments to allow
    // for effects to affect scale values?
    this.#preparePaths();

    // Health has to be prepared before defenses (in the call to super) as armor items may require looking at HP.
    // It also has to be prepared after paths because paths help define max hp.
    this.#prepareHealth();

    // Add the equipped items' defenses to your own.
    for (const item of Object.values(this.equipment)) {
      if (!item?.system.fulfilledRequirements) continue;
      for (const [k, v] of Object.entries(item.system.defenses)) this.defenses[k] += v;
    }

    super.prepareDerivedData();
    this.#prepareEncumbrance();
    this.#prepareSkills();
  }

  /* -------------------------------------------------- */

  /** Prepare current and max encumbrance. */
  #prepareEncumbrance() {
    this.encumbrance = {};
    this.encumbrance.max = Math.max(0, ...Object.values(this.progression.invested));
    this.encumbrance.value = this.parent.items.reduce((acc, item) => {
      return acc + item.system.weight.total;
    }, 0).toNearest(0.05);
  }

  /* -------------------------------------------------- */

  /** Prepare health values. */
  #prepareHealth() {
    let maximum = 0;
    for (const investment of this.progression.points._investment) {
      const { path, max, min } = investment;
      const config = artichron.config.PROGRESSION_PATHS[path];
      const interval = max - min + 1;
      maximum += config.health * interval;
    }

    // Add bonuses from traits.
    for (const trait of this.parent._traits?.health ?? []) maximum += trait.value;

    const levels = this.parent.appliedConditionLevel("injured");
    const injury = 1 - levels / artichron.config.STATUS_CONDITIONS.injured.levels;
    let max = Math.ceil(maximum * injury);

    // If injured, and the modified maximum leads to no change, remove at least 1 hp.
    if ((levels > 0) && (max === maximum)) max = Math.clamp(max, 1, maximum - 1);

    this.health.max = max;
    this.health.spent = Math.min(this.health.spent, this.health.max);
    this.health.value = this.health.max - this.health.spent;
    this.health.pct = Math.round(this.health.value / this.health.max * 100);
  }

  /* -------------------------------------------------- */

  /**
   * Prepare skills.
   */
  #prepareSkills() {
    for (const item of Object.values(this.equipment)) {
      if (!item?.system.fulfilledRequirements) continue;
      for (const k in item.system.skills) this.skills[k].number += item.system.skills[k];
    }

    for (const trait of this.parent._traits?.skill ?? []) {
      switch (trait.subtype) {
        case "diceNumber": this.skills[trait.skill].number += trait.value; break;
        case "diceFaces": this.skills[trait.skill].faces += trait.value; break;
        case "bonus": this.skills[trait.skill].bonus += trait.value; break;
      }
    }

    for (const k of Object.keys(artichron.config.SKILLS)) {
      const skill = this.skills[k];
      skill.formula = `${skill.number}d${skill.faces}`;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Prepare current paths.
   */
  #preparePaths() {
    this.progression.paths = {};

    // Create reference object for paths.
    const paths = this.parent.items.documentsByType.path.reduce((acc, path) => {
      const id = path.identifier;
      if (id in artichron.config.PROGRESSION_CORE_PATHS) {
        if (acc.coreC >= 2) {
          console.warn("The actor's paths are invalid. They have more than 2 core paths.");
          return acc;
        }
        acc.coreC++;
        acc.core[id] = path;
      }

      else if (id in artichron.config.PROGRESSION_MIXED_PATHS) {
        if (acc.mixedC >= 1) {
          console.warn("The actor's paths are invalid. They have more than 1 mixed path.");
          return acc;
        }
        acc.mixedC++;
        acc.mixed[id] = path;
      }

      return acc;
    }, { core: {}, mixed: {}, coreC: 0, mixedC: 0 });

    // Prepare data in the investments.
    let min = 0;
    const invested = {};
    for (const investments of this.progression.points._investment) {
      Object.defineProperties(investments, {
        min: { value: min + 1 },
        max: { value: Object.values(investments).reduce((acc, k) => acc + k, min) },
      });
      min = investments.max;

      for (const k in investments) {
        invested[k] ??= 0;
        invested[k] += investments[k];
      }

      const primary = HeroData.getPath(invested);
      Object.defineProperty(investments, "path", { value: primary });
    }

    const [primaryCorePath, secondaryCorePath] = Object.values(paths.core)
      .sort((a, b) => invested[b.identifier] - invested[a.identifier]);

    // Current path's id.
    const pathId = artichron.data.actors.HeroData.getPath(invested);

    // The mixed-path item.
    const mixedPath = Object.values(paths.mixed)[0];

    Object.defineProperties(this.progression, {
      paths: {
        value: Object.freeze({ ...paths.core, ...paths.mixed }),
        enumerable: false,
        writable: false,
      },
      path: {
        value: pathId ?? null,
      },
      isMixed: {
        value: pathId in artichron.config.PROGRESSION_MIXED_PATHS,
      },
      primaryPath: {
        value: primaryCorePath ?? null,
      },
      secondaryPath: {
        value: secondaryCorePath ?? null,
      },
      mixedPath: {
        value: mixedPath ?? null,
      },
    });

    if (mixedPath) invested[mixedPath.identifier] = Object.values(invested).reduce((acc, k) => acc + k, 0);
    Object.defineProperties(this.progression, {
      label: {
        value: this.progression.paths[pathId]?.name ?? game.i18n.localize("ARTICHRON.SHEET.HERO.noPath"),
      },
      invested: {
        value: { ...invested },
        enumerable: true,
      },
    });

    // Now that paths have been determined, we can prepare scaling values.
    const ranges = {};
    for (const investment of this.progression.points._investment) {
      ranges[investment.path] ??= [];
      ranges[investment.path].push([investment.min, investment.max]);
    }

    this.progression.scales = {};
    for (const pathId in ranges) {
      this.progression.scales[pathId] = {};
      const path = this.progression.paths[pathId];

      // Due to advancement both updating the actor and creating items, data preparation is run twice.
      // This results in the possibility of `path` being falsy on the first data prep iteration.
      if (!path) continue;
      for (const scale of path.getEmbeddedPseudoDocumentCollection("Advancement").getByType("scaleValue")) {
        this.progression.scales[pathId][scale.identifier] = new ScalingValue(this.parent, scale, ranges[pathId]);
      }
    }
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Fully restore any resources.
   * @param {object} [options]
   * @param {number} [options.pct]    The percentage of recovery, a numerical value between 0 and 1.
   * @returns {Promise<ActorArtichron>}
   */
  async recover({ pct = 1 } = {}) {
    const update = {};

    // Health.
    update["system.health.spent"] = Math.max(0, this.health.spent - Math.ceil(this.health.max * pct));

    return this.parent.update(update);
  }

  /* -------------------------------------------------- */

  /**
   * Roll two skills together.
   * @param {object} [config]                 Roll config.
   * @param {PointerEvent} [config.event]     Initiating click event.
   * @param {string} [config.base]            Primary skill used.
   * @param {string} [config.second]          Secondary skill used.
   * @returns {Promise<RollArtichron|null>}   A promise that resolves to the created roll.
   */
  async rollSkill({ event, base, second } = {}) {
    base = base in artichron.config.SKILLS ? base : "agility";
    second = second in artichron.config.SKILLS ? second : "agility";

    const config = {
      event, base, second,
      subject: this.parent,
    };

    if (!event?.shiftKey) {
      const configuration = await artichron.applications.apps.actor.SkillRollDialog.create({ config });
      if (!configuration) return null;
      foundry.utils.mergeObject(config, configuration);
    }

    const formula = [
      `${this.skills[config.base].formula}cs>=6`,
      "+",
      `${this.skills[config.second].formula}cs>=6`,
      "+",
      `(@skills.${config.base}.bonus + @skills.${config.second}.bonus)`,
    ].join(" ");
    const rollData = this.parent.getRollData();
    const roll = await foundry.dice.Roll.create(formula, rollData, { skills: [config.base, config.second] }).evaluate();

    const messageData = {
      flavor: game.i18n.format("ARTICHRON.SKILL.ROLL_DIALOG.flavor", {
        skills: Array.from(new Set([config.base, config.second]).map(skl => {
          return artichron.config.SKILLS[skl].label;
        })).sort((a, b) => a.localeCompare(b)).join(", "),
      }),
      speaker: ChatMessage.implementation.getSpeaker({ actor: this.parent }),
    };

    await roll.toMessage(messageData);
    return roll;
  }

  /* -------------------------------------------------- */

  /**
   * Advance the hero in one or more of its paths.
   * @param {Record<string, number>} allocated    How many points to advance in given paths.
   * @returns {Promise}                           A promise that resolves once advancement choices have been
   *                                              configured, the actor updated, and any new items created.
   */
  async advance(allocated) {
    // Verify data of the allocated points.
    for (const v of Object.values(allocated)) {
      if (!artichron.utils.isIntegerLike(v, { sign: 1 })) {
        throw new Error("One or more advancement allocations were not a positive integer!");
      }
    }

    // Updates to the actor: points spent and investments made.
    const actorUpdate = {};

    // Items to be created - new paths, granted items, all with modifications to sustain trait and item grant choices.
    const itemCreate = {};

    // Updates to existing items. (Not just path items.)
    const itemUpdates = {};

    // Determine current investment.
    const spent = Object.values(allocated).reduce((acc, k) => acc + k, 0);
    const investment = this.toObject().progression.points._investment;
    investment.push(allocated);
    const totals = investment.reduce((acc, k) => {
      for (const u in k) {
        acc[u] ??= 0;
        acc[u] += k[u];
      }
      return acc;
    }, {});
    actorUpdate["system.progression.points._investment"] = investment;
    actorUpdate["system.progression.points.value"] = this.progression.points.value - spent;

    // Missing path items, fetched from config.
    const fetchedItems = {};

    // Fetch all core paths.
    for (const k in totals) if (!this.progression.paths[k]) {
      const item = await fromUuid(artichron.config.PROGRESSION_CORE_PATHS[k].uuid);
      fetchedItems[k] = item;
    }

    // If the hero has two core paths, also make sure the mixed path exists.
    const [a, b] = Object.keys(totals);
    const mixedId = artichron.config.PROGRESSION_CORE_PATHS[a].mixed[b];
    if (mixedId in artichron.config.PROGRESSION_MIXED_PATHS) {
      if (!this.progression.paths[mixedId]) {
        const item = await fromUuid(artichron.config.PROGRESSION_MIXED_PATHS[mixedId].uuid);
        fetchedItems[mixedId] = item;
      }
    }

    const currentPathId = HeroData.getPath(totals);

    // The 'current path' item. Might exist on the actor, might also be fetched from pack.
    const pathItem = fetchedItems[currentPathId] ?? this.progression.paths[currentPathId];
    if (!pathItem) throw new Error("Failed to find current path's item!");

    const max = Object.values(totals).reduce((acc, k) => acc + k, 0);
    const chains = await artichron.data.pseudoDocuments.advancements.BaseAdvancement.performAdvancementFlow(
      pathItem,
      { range: [max - spent + 1, max] },
    );
    if (!chains) return null;

    const { traits, itemGrants } = chains.flatMap(chain => [...chain.active()]).reduce((acc, node) => {
      if (node.advancement.type === "trait") acc.traits.push(node);
      else if (node.advancement.type === "itemGrant") acc.itemGrants.push(node);
      return acc;
    }, { traits: [], itemGrants: [] });

    const itemChanges = {};
    for (const node of traits) for (const [traitId, choice] of Object.entries(node.choices)) {
      if (node.isChoice && !node.selected[traitId]) continue;
      const path = `flags.artichron.advancement.${node.advancement.id}.selected`;
      const item = node.advancement.document;
      if (item.parent === this.parent) {
        // This is an item that should be updated, not created.
        itemUpdates[item.id] ??= { _id: item.id, [path]: [...foundry.utils.getProperty(item, path) ?? []] };
        itemUpdates[item.id][path].push(traitId);
      } else {
        const uuid = item.uuid;
        itemChanges[uuid] ??= {};
        const selected = foundry.utils.getProperty(itemChanges[uuid], path);
        if (selected) selected.push(traitId);
        else foundry.utils.setProperty(itemChanges[uuid], path, [traitId]);
      }
    }

    for (const node of itemGrants) for (const [itemUuid, { item }] of Object.entries(node.choices)) {
      if (node.isChoice && !node.selected[itemUuid]) continue;
      const changes = foundry.utils.mergeObject(
        { "flags.artichron.advancement.path": currentPathId },
        itemChanges[itemUuid] ?? {},
      );
      const keepId = !(item.id in itemCreate) && !this.parent.items.has(item.id);
      const data = game.items.fromCompendium(item, { keepId });
      if (!keepId) data._id = foundry.utils.randomID();
      itemCreate[data._id] = foundry.utils.mergeObject(data, changes);
    }

    // Also create the fetched path items.
    for (const item of Object.values(fetchedItems)) {
      const keepId = !(item.id in itemCreate) && !this.parent.items.has(item.id);
      const data = game.items.fromCompendium(item, { keepId });
      if (!keepId) data._id = foundry.utils.randomID();
      itemCreate[data._id] = foundry.utils.mergeObject(data, itemChanges[item.uuid] ?? {});
    }

    await Promise.all([
      this.parent.createEmbeddedDocuments("Item", Object.values(itemCreate), { keepId: true }),
      this.parent.updateEmbeddedDocuments("Item", Object.values(itemUpdates)),
      this.parent.update(actorUpdate),
    ]);
    return this.parent;
  }

  /* -------------------------------------------------- */

  /**
   * Advance the hero in one or more of its paths. With a dialog to configure the distribution.
   * @param {object} [options={}]                 Additional options that modify the advancement.
   * @param {string[]} [options.additional=[]]    Pre-select new paths?
   * @returns {Promise}                           A promise that resolves once advancement choices have been
   *                                              configured, the actor updated, and any new items created.
   */
  async advanceDialog({ additional = [] } = {}) {
    const allocated = await artichron.applications.apps.advancement.PathConfigurationDialog.create({
      additional,
      document: this.parent,
    });
    if (!allocated) return null;
    return this.advance(allocated);
  }

  /* -------------------------------------------------- */

  /**
   * What path is a hero on?
   * @param {Record<string, number>} investment
   * @returns {string}
   */
  static getPath(investment) {
    const [p1, p2] = Object.keys(investment)
      .filter(p => (investment[p] > 0) && (p in artichron.config.PROGRESSION_CORE_PATHS))
      .sort((a, b) => investment[b] - investment[a]);

    if (!p2 || !investment[p2]) return p1 ?? null;

    const canMix = investment[p1] >= artichron.config.PROGRESSION_VALUES.absolute;
    if (!canMix) return p1;

    const total = investment[p1] + investment[p2];
    const evenInvestment = (investment[p2] / total * 100).between(
      artichron.config.PROGRESSION_VALUES.relative.lower,
      artichron.config.PROGRESSION_VALUES.relative.upper,
    );

    return evenInvestment ? artichron.config.PROGRESSION_CORE_PATHS[p1].mixed[p2] : p1;
  }

  /* -------------------------------------------------- */

  /**
   * Query method to delegate handling.
   * @type {Function}
   */
  static _query = ({ type, config }) => {
    const { heroId, ..._config } = config;
    const hero = game.actors.get(heroId);
    switch (type) {
      case "rollSkill": return hero.system.rollSkill(_config).then(roll => roll ? roll.total : null);
    }
  };
}
