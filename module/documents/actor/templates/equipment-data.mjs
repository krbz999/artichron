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
      // Calling super first to prepare actor level.
      super.prepareDerivedData();
      this.#prepareArmor();
      this.#prepareResistances();
    }

    /* -------------------------------------------------- */

    /** Prepare armor value. */
    #prepareArmor() {
      for (const item of Object.values(this.parent.armor)) {
        if (!item?.fulfilledRequirements) continue;
        this.defenses.armor += item.system.armor.value;
      }
    }

    /* -------------------------------------------------- */

    /** Prepare the value of actor resistances. */
    #prepareResistances() {
      for (const item of Object.values(this.parent.armor)) {
        if (!item?.fulfilledRequirements) continue;
        for (const [k, v] of Object.entries(item.system.resistances)) {
          this.resistances[k] += v.value;
        }
      }
    }

    /* -------------------------------------------------- */
    /*   Instance methods                                 */
    /* -------------------------------------------------- */

    /**
     * Call a dialog to change the item equipped in a particular slot.
     * @param {string} slot     The slot to change.
     * @returns {Promise}
     */
    async changeEquippedDialog(slot) {
      const type = ["primary", "secondary"].includes(slot) ? "arsenal" : "armor";
      const current = this.parent.items.get(this.equipped[type][slot]);
      const choices = this.parent.items.reduce((acc, item) => {
        if (item === current) return acc;

        if (type === "armor") {
          if ((item.type !== "armor") || (item.system.category.subtype !== slot)) return acc;
        } else if (type === "arsenal") {
          if (!item.isArsenal) return acc;
          const {primary, secondary} = this.parent.arsenal;
          if ([primary, secondary].includes(item)) return acc;
          if (slot === "secondary") {
            if (item.isTwoHanded) return acc;
            if (primary?.isTwoHanded) return acc;
          }
        }

        acc[item.id] = item.name;
        return acc;
      }, {});

      const content = !foundry.utils.isEmpty(choices) ? new foundry.data.fields.StringField({
        choices: choices,
        required: true,
        label: "ARTICHRON.EquipDialog.Label",
        hint: "ARTICHRON.EquipDialog.Hint"
      }).toFormGroup({localize: true}, {name: "itemId"}).outerHTML : null;

      const buttons = [];
      if (!foundry.utils.isEmpty(choices)) {
        buttons.push({
          action: "equip",
          label: "Confirm",
          icon: "fa-solid fa-check",
          callback: (event, button, html) => button.form.elements.itemId.value
        });
      }

      if (current) {
        buttons.push({
          action: "unequip",
          label: "Unequip",
          icon: "fa-solid fa-times"
        });
      }

      if (!buttons.length) {
        ui.notifications.warn("ARTICHRON.EquipDialog.Warning", {localize: true});
        return null;
      }

      const value = await foundry.applications.api.DialogV2.wait({
        buttons: buttons,
        rejectClose: false,
        content: content ? `<fieldset>${content}</fieldset>` : undefined,
        classes: ["artichron", "equip"],
        modal: true,
        window: {title: "ARTICHRON.EquipDialog.Title", icon: "fa-solid fa-hand-fist"},
        position: {width: 350}
      });

      if (!value) return null;

      if (value === "unequip") {
        return this.changeEquipped(slot);
      }

      const item = this.parent.items.get(value);
      return this.changeEquipped(slot, item);
    }

    /* -------------------------------------------------- */

    /**
     * Change the item equipped in a particular slot.
     * @param {string} slot                   The slot to change equipment in.
     * @param {ItemArtichron} [item=null]     An optional item to equip in the given slot.
     * @returns {Promise<ActorArtichron>}     A promise that resolves to the updated actor.
     */
    async changeEquipped(slot, item = null) {
      const type = ["primary", "secondary"].includes(slot) ? "arsenal" : "armor";
      const path = `system.equipped.${type}.${slot}`;
      const current = foundry.utils.getProperty(this.parent, path);
      const update = {[path]: item ? item.id : ""};
      if ((type === "arsenal") && (slot === "primary") && (item !== current) && item?.isTwoHanded) {
        update[path.replace(slot, "secondary")] = "";
      }

      await this.parent.update(update);
      return this.parent;
    }

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
