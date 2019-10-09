import fs from "fs";
import path from "path";

import ncp from "ncp";
import nexe from "nexe";
import rollup from "rollup";
import zap from "zip-a-folder";
import nodew from "create-nodew-exe";

import pkg from "./package.json";

ncp.limit = 16;

let {platform} = process;

let ext = (
  platform === "win32" ? ".exe" : ""
);

let bundleName = pkg.name;

// e.g. --node-binary="windows-x64-12.9.1"
// specify the node-binary version to use
let nodeBinary = (
  process.env.npm_config_node_binary
) || "windows-x64-12.9.1";

// i.e. --build-node
// instead of using a pre-built node binary
// you can build it yourself on your machine
let buildNode = !!(
  process.env.npm_config_build_node
);

(async function main() {

  let srcPath = `main.mjs`;
  let dstPath = `dist/${pkg.version}`;
  let releasePath = `${dstPath}/${platform}-${pkg.version}.zip`;
  let zipReleasePath = `${dstPath}/../${platform}-${pkg.version}.zip`;

  console.log(`Reserving directories..`);
  // reserve directories
  if (!fs.existsSync(dstPath)) fs.mkdirSync(dstPath);

  // delete previous zip release, if exists
  if (fs.existsSync(zipReleasePath)) fs.unlinkSync(zipReleasePath);

  // create bundle.js
  console.log(`Creating bundled distribution file..`);
  let bundle = await rollup.rollup({
    input: srcPath
  });
  let {output} = await bundle.generate({
    file: `${bundleName}.js`,
    format: "cjs"
  });
  await bundle.write({
    file: `${bundleName}.js`,
    format: "cjs"
  });

  // creating executable in dist/x/bundle
  console.log(`Creating executable..`);
  await nexe.compile({
    build: buildNode,
    input: `${bundleName}.js`,
    target: nodeBinary
  });

  // move the bundle.js into dist/x/bundle.js
  fs.renameSync(`./${bundleName}.js`, dstPath + `/${bundleName}.js`);
  // move the executeable into dist/x/bundle.exe
  fs.renameSync(`./${bundleName}${ext}`, dstPath + `/${bundleName}${ext}`);

  // copying assets to dist/x/assets
  ncp("./assets", dstPath + "/assets", async function(err) {
    if (err) {
     return console.error(err);
    } else {
      // patch the executable to not show a window (windows-oly)
      if (platform === "win32") {
        nodew({
          src: dstPath + `/${bundleName}.exe`,
          dst: dstPath + `/${bundleName}.exe`
        });
      }
      // zip everything
      await zap.zip(dstPath, zipReleasePath);
      // move the zip from ../ to ./
      fs.renameSync(zipReleasePath, releasePath);
    }
  });

})();
