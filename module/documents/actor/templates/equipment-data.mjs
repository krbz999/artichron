const {SchemaField, StringField} = foundry.data.fields;

const EquipmentTemplateMixin = Base => {
  return class EquipmentTemplate extends Base {
    /** @override */
    static defineSchema() {
      const schema = super.defineSchema();

      schema.equipped = new SchemaField({
        arsenal: new SchemaField({
          primary: new StringField({required: true}),
          secondary: new StringField({required: true})
        }),
        armor: new SchemaField(Object.keys(CONFIG.SYSTEM.EQUIPMENT_TYPES).reduce((acc, key) => {
          acc[key] = new StringField({required: true});
          return acc;
        }, {}))
      });

      return schema;
    }

    /* -------------------------------------------------- */
    /*   Preparation methods                              */
    /* -------------------------------------------------- */

    /** @override */
    prepareBaseData() {
      super.prepareBaseData();
      this.bonuses = {damage: {}};
      this.resistances = {};
      for (const k of Object.keys(CONFIG.SYSTEM.DAMAGE_TYPE_GROUPS)) {
        this.bonuses.damage[k] = 0;
      }
      for (const [k, v] of Object.entries(CONFIG.SYSTEM.DAMAGE_TYPES)) {
        if (v.resist) this.resistances[k] = 0;
      }
      this.defenses = {armor: 0};
    }

    /* -------------------------------------------------- */

    /** @override */
    prepareDerivedData() {
      super.prepareDerivedData();
      this.#prepareArmor();
      this.#prepareResistances();
    }

    /* -------------------------------------------------- */

    /** Prepare armor value. */
    #prepareArmor() {
      for (const item of Object.values({...this.parent.armor, ...this.parent.arsenal})) {
        if (["armor", "shield"].includes(item?.type)) this.defenses.armor += item.system.armor.value;
      }
    }

    /* -------------------------------------------------- */

    /** Prepare the value of actor resistances. */
    #prepareResistances() {
      for (const item of Object.values(this.parent.armor)) {
        if (!item) continue;
        for (const [k, v] of Object.entries(item.system.resistances)) {
          this.resistances[k] += v.value;
        }
      }
    }

    /* -------------------------------------------------- */
    /*   Instance methods                                 */
    /* -------------------------------------------------- */

    /* -------------------------------------------------- */
    /*   Properties                                       */
    /* -------------------------------------------------- */

    /**
     * The currently equipped arsenal.
     * @type {{primary: ItemArtichron, secondary: ItemArtichron}}
     */
    get arsenal() {
      const items = this.equipped.arsenal;
      let primary = this.parent.items.get(items.primary) ?? null;
      if (!primary?.isArsenal) primary = null;
      let secondary = this.parent.items.get(items.secondary) ?? null;
      if (!secondary?.isArsenal || (primary?.isTwoHanded || secondary.isTwoHanded)) secondary = null;
      return {primary, secondary};
    }

    /* -------------------------------------------------- */

    /**
     * The currently equipped armor set.
     * @type {object}
     */
    get armor() {
      const items = this.equipped.armor;
      return Object.keys(CONFIG.SYSTEM.EQUIPMENT_TYPES).reduce((acc, k) => {
        const item = this.parent.items.get(items[k]) ?? null;
        acc[k] = ((item?.type === "armor") && (item.system.category.subtype === k)) ? item : null;
        return acc;
      }, {});
    }

    /* -------------------------------------------------- */

    /**
     * Does this actor have a shield equipped?
     * @type {boolean}
     */
    get hasShield() {
      const {primary, secondary} = this.arsenal;
      return (primary?.type === "shield") || (secondary?.type === "shield");
    }
  };
};

export default EquipmentTemplateMixin;
