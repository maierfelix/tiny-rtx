import fs from "fs";
import path from "path";

import _ncp from "ncp";
import nexe from "nexe";
import rollup from "rollup";
import zap from "zip-a-folder";
import nodew from "create-nodew-exe";

import pkg from "./package.json";

_ncp.limit = 16;

// make ncp promiseable
let ncp = function(src, dst, opts = {}) {
  return new Promise(resolve => {
    _ncp(src, dst, opts, e => {
      if (e) throw e;
      resolve();
    });
  });
};

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
  let zipReleasePath = `${dstPath}/../${pkg.name}-${platform}-${pkg.version}.zip`;

  let srcNodeModulesPath = `./node_modules`;
  let dstNodeModulesPath = `${dstPath}/node_modules`;

  console.log(`Reserving directories..`);
  // reserve directories
  if (!fs.existsSync(dstPath)) fs.mkdirSync(dstPath);
  if (!fs.existsSync(dstPath + "/node_modules")) fs.mkdirSync(dstPath + "/node_modules");

  // delete previous zip release, if exists
  if (fs.existsSync(releasePath)) fs.unlinkSync(releasePath);
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
  await ncp("./assets", dstPath + "/assets");
  //await ncp("./assets", dstPath + "/assets");

  // add necessary dependencies
  for (let key in pkg.dependencies) {
    let targetFolderPath = `${dstNodeModulesPath}/${key}`;
    if (targetFolderPath.match(`@cwasm`)) {
      targetFolderPath = `${dstNodeModulesPath}/@cwasm`;
    }
    if (!fs.existsSync(targetFolderPath)) fs.mkdirSync(targetFolderPath);
    await ncp(`${srcNodeModulesPath}/${key}`, `${dstNodeModulesPath}/${key}`);
  };

  // patch the executable to not show a console (windows-oly)
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

})();
