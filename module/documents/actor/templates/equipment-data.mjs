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
    prepareDerivedData() {
      super.prepareDerivedData();
      this.#prepareArmor();
      this.#prepareResistances();
    }

    /* -------------------------------------------------- */

    /** Prepare armor value. */
    #prepareArmor() {
      const armor = this.defenses.armor;
      armor.value = Object.values({...this.parent.armor, ...this.parent.arsenal}).reduce((acc, item) => {
        return acc + (["armor", "shield"].includes(item?.type) ? item.system.armor.value : 0);
      }, armor.value);
    }

    /* -------------------------------------------------- */

    /** Prepare the value of actor resistances. */
    #prepareResistances() {
      for (const item of Object.values(this.parent.armor)) {
        if (!item) continue;
        for (const [k, v] of Object.entries(item.system.resistances)) {
          this.resistances[k].value += v.value;
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
