import fs from "fs";
import url from "url";
import path from "path";
import tolw from "tolw";
import lodepng from "@cwasm/lodepng";
import essentials from "nvk-essentials"; const {GLSL} = essentials;


global.result = null;
export function ASSERT_VK_RESULT(result) {
  if (result !== VK_SUCCESS) {
    for (let key in VkResult) {
      if (VkResult[key] === result) {
        throw new Error(`Vulkan assertion failed with ${key}`);
      }
    };
    throw new Error(`Vulkan assertion failed with ${result}`);
  }
};

export function readBinarySPIRVShader(path) {
  let ext = path.substr(path.lastIndexOf(".") + 1);
  let out = GLSL.toSPIRVSync({
    source: fs.readFileSync(path),
    extension: ext
  });
  if (out.error) throw new Error(out.error);
  return out.output;
};

export function readBinaryFile(path) {
  let buffer = fs.readFileSync(path);
  let {byteOffset, byteLength} = buffer;
  return new Uint8Array(buffer.buffer).subarray(byteOffset, byteOffset + byteLength);
};

export function readObjectFile(path) {
  LOG(`Reading Object File from '${path}'`);
  let binaryFile = readBinaryFile(path);
  let object = tolw.loadObj(binaryFile);
  return object;
};

export function readPNGFile(path) {
  LOG(`Reading PNG File from '${path}'`);
  let binaryFile = readBinaryFile(path);
  return lodepng.decode(fs.readFileSync(path));
};

let pProperties = null;
export function isValidationLayerAvailable(layerName) {
  // instantiate array of available layers
  if (pProperties === null) {
    let pPropertyCount = { $: 0 };
    result = vkEnumerateInstanceLayerProperties(pPropertyCount, null);
    pProperties = [...Array(pPropertyCount.$)].map(() => new VkLayerProperties());
    result = vkEnumerateInstanceLayerProperties(pPropertyCount, pProperties);
  }
  for (let ii = 0; ii < pProperties.length; ++ii) {
    if (pProperties[ii].layerName === layerName) return true;
  };
  return false;
};

export function validateValidationLayers(layers) {
  for (let ii = 0; ii < layers.length; ++ii) {
    let layerName = layers[ii];
    if (!isValidationLayerAvailable(layerName)) {
      throw new ReferenceError(`Layer '${layerName}' is not available!`);
    }
  };
};

export function LOG() {
  if (global.VERBOSE) console.log.apply(console, arguments);
};

export function WARN() {
  let args = "";
  for (let ii = 0; ii < arguments.length; ++ii) {
    args += arguments[ii].toString() + (ii < arguments.length - 1 ? " " : "");
  };
  console.log("\x1b[33m%s\x1b[0m", args);
};

export const __dirname = path.dirname(url.fileURLToPath(import.meta.url)) + "/../";
