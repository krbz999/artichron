/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export async function preloadHandlebarsTemplates() {
  return loadTemplates([
    // array of paths to hbs files goes here
    "systems/artichron/templates/partials/actor-controls.hbs",
    "systems/artichron/templates/partials/actor-effects.hbs",
    "systems/artichron/templates/partials/actor-equipped.hbs",
    "systems/artichron/templates/partials/actor-favorites.hbs",
    "systems/artichron/templates/partials/actor-health.hbs",
    "systems/artichron/templates/partials/actor-inventory.hbs",
    "systems/artichron/templates/partials/actor-pools.hbs",
    "systems/artichron/templates/partials/actor-resistances.hbs",
    "systems/artichron/templates/partials/item-damages.hbs",
    "systems/artichron/templates/partials/item-defenses.hbs",
    "systems/artichron/templates/partials/item-effects.hbs",
    "systems/artichron/templates/partials/item-resistances.hbs",
    "systems/artichron/templates/partials/item-type.hbs"
  ]);
};
