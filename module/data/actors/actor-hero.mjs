import CreatureData from "./creature-data.mjs";

const { NumberField, SchemaField, TypedObjectField } = foundry.data.fields;

export default class HeroData extends CreatureData {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      embedded: {},
    });
  }

  /* -------------------------------------------------- */

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
        paths: new TypedObjectField(new SchemaField({
          invested: new NumberField({ min: 0, integer: true, initial: 0 }),
        }), { validateKey: key => key in artichron.config.PROGRESSION_CORE_PATHS }),
        points: new SchemaField({
          value: new NumberField({ min: 0, nullable: false, initial: 0, integer: true }),
        }),
      }),
      skills: new SchemaField(Object.entries(artichron.config.SKILLS).reduce((acc, [k, v]) => {
        acc[k] = new SchemaField({
          number: new NumberField({ integer: true, min: 2, initial: 2, nullable: false }),
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
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Pools are prepared first as most other properties rely on these.
    this.#preparePools();
    this.#prepareEncumbrance();
    this.#prepareHealth();
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
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The hero's current paths. In order, the current path (possibly a core path), then the core path
   * with the highest investment, then the core path with the least investment.
   * @type {Array<string|null>}
   */
  get currentPaths() {
    const paths = [null, null, null];

    // Core paths, sorted highest first.
    const corePaths = Object.keys(this.progression.paths)
      .filter(path => path in artichron.config.PROGRESSION_CORE_PATHS)
      .sort((a, b) => this.progression.paths[b].invested - this.progression.paths[a].invested);
    if (!corePaths.length) return paths;

    if (corePaths.length === 1) {
      paths[0] = paths[1] = corePaths[0];
      return paths;
    }

    paths[1] = corePaths[0];
    paths[2] = corePaths[1];

    // Is mixed path?
    const values = artichron.config.PROGRESSION_VALUES;
    const total = corePaths.reduce((acc, path) => acc + this.progression.paths[path].invested, 0);
    const isMixed = corePaths.some(path => this.progression.paths[path].invested >= values.absolute)
      && (this.progression.paths[paths[1]].invested / total * 100).between(values.relative.lower, values.relative.upper);

    // Current path is the mixed path unless the difference is too great.
    paths[0] = isMixed ? artichron.config.PROGRESSION_CORE_PATHS[corePaths[0]].mixed[corePaths[1]] : paths[1];

    return paths;
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
      const configuration = await artichron.applications.apps.actor.SkillRollDialog.create({
        config,
        document: this.parent,
      });
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
    const actorUpdate = {};

    let spent = 0;
    for (const [k, v] of Object.entries(allocated)) {
      if (!artichron.utils.isIntegerLike(v, { sign: 1 })) {
        throw new Error("One or more advancement allocations were not a positive integer!");
      }

      spent += Number(v);
      actorUpdate[`system.progression.paths.${k}.invested`] = (this.progression.paths[k]?.invested ?? 0) + Number(v);
    }
    actorUpdate["system.progression.points.value"] = this.progression.points.value - spent;

    const range = [Object.values(this.progression.paths).reduce((acc, p) => acc + p.invested, 1)];
    const clone = this.parent.clone(actorUpdate, { keepId: true });

    if (Object.keys(clone.system.progression.paths).length > 2) {
      throw new Error("You cannot advance in more than two paths!");
    }

    const path = clone.system.currentPaths[0];
    range.push(Object.values(clone.system.progression.paths).reduce((acc, p) => acc + p.invested, 0));

    const uuid = (path in artichron.config.PROGRESSION_CORE_PATHS)
      ? artichron.config.PROGRESSION_CORE_PATHS[path].uuid
      : artichron.config.PROGRESSION_MIXED_PATHS[path].uuid;
    const pathItem = await fromUuid(uuid);
    const itemData = await artichron.data.pseudoDocuments.advancements.BaseAdvancement.configureAdvancement(
      this.parent,
      pathItem,
      { range },
    );
    if (!itemData) return null;

    return Promise.all([
      this.parent.update(actorUpdate),
      this.parent.createEmbeddedDocuments("Item", itemData, { keepId: true }),
    ]);
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
}
