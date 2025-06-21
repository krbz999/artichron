import CreatureData from "./creature-data.mjs";
import ScalingValue from "./utils/scaling-value.mjs";

const { ArrayField, NumberField, SchemaField, TypedObjectField } = foundry.data.fields;

/**
 * @typedef PoolData
 * @property {number} faces
 * @property {number} max
 * @property {number} spent
 */

/**
 * @typedef SkillData
 * @property {number} number
 * @property {number} denomination
 * @property {number} bonus
 */

/**
 * @typedef HeroDataSchema
 * @property {object} pools
 * @property {PoolData} pools.health
 * @property {PoolData} pools.health
 * @property {PoolData} pools.mana
 *
 * @property {object} progression
 * @property {object} progression.points
 * @property {number} progression.points.value
 * @property {Array<Record<string, number>>} progression.points._investment
 *
 * @property {object} skills
 * @property {SkillData} skills.agility
 * @property {SkillData} skills.brawn
 * @property {SkillData} skills.mind
 * @property {SkillData} skills.spirit
 */

export default class HeroData extends CreatureData {
  /** @inheritdoc */
  static defineSchema() {
    const poolSchema = () => {
      return new SchemaField({
        faces: new NumberField({ min: 2, integer: true, initial: 6, nullable: false }),
        max: new NumberField({ min: 0, integer: true, initial: 2, nullable: false }),
        spent: new NumberField({ min: 0, integer: true, initial: 0 }),
      }, {
        trackedAttribute: true,
      });
    };

    return Object.assign(super.defineSchema(), {
      pools: new SchemaField({
        health: poolSchema(),
        stamina: poolSchema(),
        mana: poolSchema(),
      }),
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
          denomination: new NumberField({ integer: true, min: 2, initial: 6, nullable: false }),
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
  prepareDerivedData() {
    super.prepareDerivedData();

    // Prepare paths. This happens here rather than prepareBaseData due to items' pseudo-documents
    // having to be prepared first, but could be moved to post-prepareEmbeddedDocuments to allow
    // for effects to affect scale values?
    this.#preparePaths();

    // Pools are prepared first as most other properties rely on these.
    this.#preparePools();
    this.#prepareEncumbrance();
    this.#prepareHealth();
    this.#prepareSkills();
  }

  /* -------------------------------------------------- */

  /** Prepare pools. */
  #preparePools() {
    for (const k of ["health", "stamina", "mana"]) {
      const value = this.pools[k].max - this.pools[k].spent;
      this.pools[k].value = Math.max(0, value);
      this.pools[k].pct = Math.round(this.pools[k].value / this.pools[k].max * 100);
    }
  }

  /* -------------------------------------------------- */

  /** Prepare current and max encumbrance. */
  #prepareEncumbrance() {
    const dice = this.pools.stamina;
    this.encumbrance = {};
    this.encumbrance.max = (dice.max * dice.faces).toNearest(0.05);
    this.encumbrance.value = this.parent.items.reduce((acc, item) => {
      return acc + item.system.weight.total;
    }, 0).toNearest(0.05);
  }

  /* -------------------------------------------------- */

  /** Prepare health values. */
  #prepareHealth() {
    // Set health maximum and clamp current health.
    const levels = this.parent.appliedConditionLevel("injured");
    const injury = 1 - levels / artichron.config.STATUS_CONDITIONS.injured.levels;
    const total = this.pools.health.max * this.pools.health.faces;

    let max = Math.ceil(total * injury);
    if ((levels > 0) && (max === total)) max = Math.clamp(max, 1, total - 1);

    this.health.max = max;
    this.health.value = Math.clamp(this.health.value, 0, this.health.max);
    this.health.pct = Math.round(this.health.value / this.health.max * 100);
  }

  /* -------------------------------------------------- */

  /**
   * Prepare skills.
   */
  #prepareSkills() {
    for (const skill of Object.values(this.skills)) {
      skill.formula = `${skill.number}d${skill.denomination}`;
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
        value: this.progression.paths[pathId]?.name ?? "",
      },
      invested: {
        value: { ...invested },
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
   * @returns {Promise<ActorArtichron>}
   */
  async recover() {
    const update = {};
    update["system.health.value"] = this.health.max;

    // Pools.
    for (const k of ["health", "stamina", "mana"]) update[`system.pools.${k}.spent`] = 0;

    return this.parent.update(update);
  }

  /* -------------------------------------------------- */

  /**
   * Roll two skills together.
   * @param {import("../../_types").SkillRollConfiguration} [config]      Roll configuration.
   * @param {import("../../_types").RollDialogConfiguration} [dialog]     Dialog configuration.
   * @param {import("../../_types").RollMessageConfiguration} [message]   Chat message configuration.
   * @returns {Promise<RollArtichron|null>}   A promise that resolves to the created roll.
   */
  async rollSkill(config = {}, dialog = {}, message = {}) {
    const skillIds = Object.keys(artichron.config.SKILLS);
    dialog.configure = (!config.event?.shiftKey && (dialog.configure !== false)) || !(skillIds.includes(config.base) && skillIds.includes(config.second));

    config.subject = this.parent;

    if (dialog.configure) {
      const configuration = await artichron.applications.apps.actor.SkillRollDialog.create({ config });
      if (!configuration) return null;
      foundry.utils.mergeObject(config, configuration);
    }

    const formula = [
      `(@skills.${config.base}.number + @skills.${config.second}.number)d6cs=6`,
      "+",
      `(@skills.${config.base}.bonus + @skills.${config.second}.bonus)`,
    ].join(" ");
    const rollData = this.parent.getRollData();
    const roll = await foundry.dice.Roll.create(formula, rollData, { skills: [config.base, config.second] }).evaluate();

    message = foundry.utils.mergeObject({
      create: true,
      messageData: {
        flavor: game.i18n.format("ARTICHRON.SKILL.ROLL_DIALOG.flavor", {
          skills: Array.from(new Set([config.base, config.second]).map(skl => {
            return artichron.config.SKILLS[skl].label;
          })).sort((a, b) => a.localeCompare(b)).join(", "),
        }),
        speaker: ChatMessage.implementation.getSpeaker({ actor: this.parent }),
      },
    }, message);

    if (message.create) await roll.toMessage(message.messageData);
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

    const actorUpdate = {};
    const itemCreate = [];
    const spent = Object.values(allocated).reduce((acc, k) => acc + k, 0);

    // Determine current investment.
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

    // Fetched items. A record to make sure everything exists, either on the actor or fetched from pack.
    const fetchedItems = {};

    // The current path. Either a to-be-created item or an existing item.
    const pathId = HeroData.getPath(totals);

    // Fetch all core paths.
    for (const k in totals) {
      if (this.progression.paths[k]) {
        fetchedItems[k] = this.progression.paths[k];
      } else {
        const item = await fromUuid(artichron.config.PROGRESSION_CORE_PATHS[k].uuid);
        fetchedItems[k] = item;
        itemCreate.push(game.items.fromCompendium(item));
      }
    }

    // Current mixed path's item. If missing, create it.
    const [a, b] = Object.keys(totals);
    const mixedId = artichron.config.PROGRESSION_CORE_PATHS[a].mixed[b];
    if (mixedId in artichron.config.PROGRESSION_MIXED_PATHS) {
      if (this.progression.paths[mixedId]) {
        fetchedItems[mixedId] = this.progression.paths[mixedId];
      } else {
        const item = await fromUuid(artichron.config.PROGRESSION_MIXED_PATHS[mixedId].uuid);
        fetchedItems[mixedId] = item;
        itemCreate.push(game.items.fromCompendium(item));
      }
    }

    // The 'current path' item. Might exist on the actor, might also be fetched from pack.
    const pathItem = fetchedItems[pathId];

    // Scale values.
    // These are done entirely during regular data prep.

    // Item Grants.
    const max = Object.values(totals).reduce((acc, k) => acc + k, 0);
    const range = [max - spent + 1, max];

    const itemData = await artichron.data.pseudoDocuments.advancements.ItemGrantAdvancement.configureAdvancement(
      this.parent,
      pathItem,
      { range },
    );
    if (!itemData) return null;
    itemCreate.push(...itemData);

    await Promise.all([
      this.parent.createEmbeddedDocuments("Item", itemCreate, { keepId: true }),
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
}
