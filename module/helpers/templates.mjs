/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @returns {Promise}
 */
export async function preloadHandlebarsTemplates() {
  return loadTemplates([
    // array of paths to hbs files goes here
    "systems/artichron/templates/partials/item-type.hbs"
  ]);
}
