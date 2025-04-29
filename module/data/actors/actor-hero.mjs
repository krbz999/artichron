import CreatureData from "./creature-data.mjs";

const { HTMLField, NumberField, SchemaField } = foundry.data.fields;

export default class HeroData extends CreatureData {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      type: "hero",
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    const schema = super.defineSchema();

    const poolSchema = () => {
      return new SchemaField({
        base: new NumberField({ min: 0, integer: true, initial: 0, nullable: false }),
        faces: new NumberField({ min: 0, integer: true, initial: 0, nullable: false }),
        increase: new NumberField({ min: 0, integer: true, initial: 0, nullable: false }),
        spent: new NumberField({ min: 0, integer: true, initial: 0 }),
      }, {
        trackedAttribute: true,
      });
    };

    schema.pools = new SchemaField({
      health: poolSchema(),
      stamina: poolSchema(),
      mana: poolSchema(),
    });

    schema.skills = new SchemaField(Object.entries(artichron.config.SKILLS).reduce((acc, [k, v]) => {
      acc[k] = new SchemaField({
        number: new NumberField({ integer: true, min: 2, initial: 2, nullable: false }),
        bonus: new NumberField({ integer: true, min: 0, initial: 0 }),
      });
      return acc;
    }, {}));

    schema.details = new SchemaField({
      notes: new HTMLField({ required: true }),
    });

    return schema;
  }

  /* -------------------------------------------------- */
  /*   Preparation methods                              */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareBaseData() {
    super.prepareBaseData();

    // Set pool maximums.
    for (const [k, v] of Object.entries(this.pools)) {
      v.max = v.base + v.increase;
    }
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

  /** @inheritdoc */
  static get BONUS_FIELDS() {
    const bonus = super.BONUS_FIELDS;

    // Pools
    for (const k of ["health", "mana", "stamina"]) {
      bonus.add(`system.pools.${k}.max`);
      bonus.add(`system.pools.${k}.faces`);
    }

    // Skills
    for (const k of Object.keys(artichron.config.SKILLS)) {
      bonus.add(`system.skills.${k}.number`);
      bonus.add(`system.skills.${k}.bonus`);
    }

    bonus.add("system.details.notes");

    return bonus;
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
   * Roll one or more dice from a pool.
   * @param {import("../../_types").PoolRollConfiguration} [config]       Roll configuration.
   * @param {import("../../_types").RollDialogConfiguration} [dialog]     Dialog configuration.
   * @param {import("../../_types").RollMessageConfiguration} [message]   Chat message configuration.
   * @returns {Promise<RollArtichron|null>}   A promise that resolves to the created roll.
   */
  async rollPool(config = {}, dialog = {}, message = {}) {
    config = foundry.utils.mergeObject({
      pool: "health",
      amount: 1,
    }, config);

    const pool = this.pools[config.pool];
    if (pool.value < config.amount) {
      ui.notifications.warn("ARTICHRON.ROLL.Pool.Warning.NotEnoughPoolDice", {
        format: { name: this.parent.name, type: game.i18n.localize(`ARTICHRON.Pools.${config.pool.capitalize()}`) },
      });
      return null;
    }

    const update = {};
    const actor = this.parent;

    if ((dialog.configure !== false) && !config.event?.shiftKey) {
      dialog = foundry.utils.mergeObject({
        content: new NumberField({
          label: "ARTICHRON.ROLL.Pool.AmountLabel",
          hint: "ARTICHRON.ROLL.Pool.AmountHint",
          min: 1,
          max: pool.value,
          step: 1,
          nullable: false,
        }).toFormGroup({ localize: true }, { value: config.amount, name: "amount" }).outerHTML,
        window: {
          title: game.i18n.format("ARTICHRON.ROLL.Pool.Title", {
            type: game.i18n.localize(`ARTICHRON.Pools.${config.pool.capitalize()}`),
          }),
        },
        position: {
          width: 400,
        },
        ok: {
          label: "ARTICHRON.ROLL.Pool.Button",
        },
        modal: true,
      }, dialog, { insertKeys: false });
      const configuration = await artichron.applications.api.Dialog.input(dialog);
      if (!configuration) return null;
      config.amount = configuration.amount;
    }

    const roll = await foundry.dice.Roll.create("(@amount)d@faces", { amount: config.amount, faces: pool.faces }).evaluate();
    update[`system.pools.${config.pool}.spent`] = pool.spent + parseInt(config.amount);

    message = foundry.utils.mergeObject({
      create: true,
      messageData: {
        speaker: ChatMessage.implementation.getSpeaker({ actor: actor }),
        flavor: game.i18n.format("ARTICHRON.ROLL.Pool.Flavor", {
          type: game.i18n.localize(`ARTICHRON.Pools.${config.pool.capitalize()}`),
        }),
        "flags.artichron.roll.type": config.pool,
      },
    }, message, { insertKeys: false });

    if (message.create) await roll.toMessage(message.messageData);

    await actor.update(update);
    return roll;
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
    const skills = Object.entries(this.skills).map(([k, v], i) => {
      return {
        value: k,
        checked: (k === config.base) || (!i && !config.base),
        checked2: (k === config.second) || (!i && !config.second),
        img: artichron.config.SKILLS[k].img,
        label: artichron.config.SKILLS[k].label,
      };
    });

    const skillIds = Object.keys(artichron.config.SKILLS);
    dialog.configure = (!config.event?.shiftKey && (dialog.configure !== false)) || !(skillIds.includes(config.base) && skillIds.includes(config.second));

    if (dialog.configure) {
      const dialogData = foundry.utils.mergeObject({
        content: await foundry.applications.handlebars.renderTemplate(
          "systems/artichron/templates/actor/skill-dialog.hbs",
          { skills: skills },
        ),
        modal: true,
        window: {
          title: game.i18n.format("ARTICHRON.SkillsDialog.Title", { name: this.parent.name }),
          icon: "fa-solid fa-hand-fist",
        },
        position: { width: 400, height: "auto" },
        classes: ["skills"],
      }, dialog, { insertKeys: false });

      const configuration = await artichron.applications.api.Dialog.input(dialogData);
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
        flavor: game.i18n.format("ARTICHRON.SkillsDialog.Flavor", {
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
}
