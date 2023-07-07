/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

export function registerHandlebarHelpers() {
  Handlebars.registerHelper("capitalize", function(word) {
    return word.capitalize();
  });

  Handlebars.registerHelper("iterate", function(num, block) {
    let accum = '';
    for (let i = 0; i < num; i++) accum += block.fn(this);
    return accum;
  });
}
