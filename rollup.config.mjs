import postcss from "rollup-plugin-postcss";
import resolve from "@rollup/plugin-node-resolve";
import postcssImport from "postcss-import";
import path from "path";

export default [{
  input: "./artichron.mjs",
  output: {
    file: "./public/artichron.mjs",
    format: "esm",
  },
}, {
  input: "./artichron.css",
  output: {
    file: "./public/artichron.css",
    format: "esm",
  },
  plugins: [
    resolve(),
    postcss({
      plugins: [postcssImport()],
      extract: path.resolve("public/artichron.css"),
    }),
  ],
}];
