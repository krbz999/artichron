const fs = require("fs");

/**
 * Update manifest file with new version.
 * @param {string} [v="patch"]      The number to up by 1 in the version number, either 'major', 'minor', or 'patch'.
 */
function updateManifest(v = "patch") {
  const file = fs.readFileSync("module.json");
  const obj = JSON.parse(file);
  const old = obj.version;
  let [major, minor, patch] = old.split(".");
  switch (v) {
    case "patch": patch = Number(patch) + 1; break;
    case "minor": minor = Number(minor) + 1; patch = 0; break;
    case "major": major = Number(major) + 1; minor = patch = 0; break;
  }
  const newV = [major, minor, patch].join(".");
  obj.version = newV;
  obj.download = `${obj.url}/releases/download/v${newV}/module.zip`;

  fs.writeFileSync("module.json", JSON.stringify(obj, null, 2) + '\n');
}

/**
 * Merge all files in 'styles' into one css file.
 */
function mergeCSS() {
  const path = "styles";
  const content = fs.readdirSync(path).reduce((acc, name) => {
    return acc + fs.readFileSync(`${path}/${name}`) + "\n";
  }, "");
  fs.writeFileSync("artichron.css", content);
}

module.exports = {updateManifest, mergeCSS};
