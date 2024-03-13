import * as fvtt from "@foundryvtt/foundryvtt-cli";
import fs from "fs";
import path from "path";

const action = process.argv[2];
const doPacking = action === "pack";
const doUnpacking = action === "unpack";

const yaml = false;
const srcPath = path.join("src", "packs");
const livePath = "packs";
const systemJson = JSON.parse(fs.readFileSync("system.json"));
const packs = systemJson.packs.map(p => p.name);

async function packCompendiums() {
  for (const pack of packs) {
    const inpath = path.join(srcPath, pack);
    const outpath = path.join(livePath, pack);
    console.log('Packing:', pack);
    await fvtt.compilePack(inpath, outpath, {yaml});
  }
}

async function unpackCompendiums() {
  for (const pack of packs) {
    const inpath = path.join(livePath, pack);
    const outpath = path.join(srcPath, pack);
    console.log('Unpacking:', pack);
    await fvtt.extractPack(inpath, outpath, {yaml});
  }
}

if (doUnpacking) await unpackCompendiums();
else if (doPacking) await packCompendiums();
