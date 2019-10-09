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
  let {tangents, bitangents} = calculateTangentsAndBitangents(object);
  object = {
    vertices: new Float32Array(object.vertices),
    normals: new Float32Array(object.normals),
    tangents: tangents,
    uvs: new Float32Array(object.uvs),
    indices: new Uint32Array(object.indices)
  };
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

// an evil hack..
// this does the following:
// - check if __dirname is available (running not in ESM mode)
// - if running in ESM mode, use import.meta.url for __dirname
// - if running in non-ESM mode, uses the original __dirname
export const dirname = (
  (typeof __dirname === "undefined") ?
  path.dirname(url.fileURLToPath(import.meta.url)) + "/../" :
  __dirname
);

export function calculateTangentsAndBitangents(object) {
  let {vertices, normals, uvs, indices} = object;

  let tangents = new Float32Array(vertices.length);
  let bitangents = new Float32Array(vertices.length);
  for (let ii = 0; ii < indices.length; ii += 3) {
    let i0 = indices[ii + 0];
    let i1 = indices[ii + 1];
    let i2 = indices[ii + 2];

    let xv0 = vertices[i0 * 3 + 0];
    let yv0 = vertices[i0 * 3 + 1];
    let zv0 = vertices[i0 * 3 + 2];

    let xuv0 = uvs[i0 * 2 + 0];
    let yuv0 = uvs[i0 * 2 + 1];

    let xv1 = vertices[i1 * 3 + 0];
    let yv1 = vertices[i1 * 3 + 1];
    let zv1 = vertices[i1 * 3 + 2];

    let xuv1 = uvs[i1 * 2 + 0];
    let yuv1 = uvs[i1 * 2 + 1];

    let xv2 = vertices[i2 * 3 + 0];
    let yv2 = vertices[i2 * 3 + 1];
    let zv2 = vertices[i2 * 3 + 2];

    let xuv2 = uvs[i2 * 2 + 0];
    let yuv2 = uvs[i2 * 2 + 1];

    let deltaPosX1 = xv1 - xv0;
    let deltaPosY1 = yv1 - yv0;
    let deltaPosZ1 = zv1 - zv0;

    let deltaPosX2 = xv2 - xv0;
    let deltaPosY2 = yv2 - yv0;
    let deltaPosZ2 = zv2 - zv0;

    let uvDeltaPosX1 = xuv1 - xuv0;
    let uvDeltaPosY1 = yuv1 - yuv0;

    let uvDeltaPosX2 = xuv2 - xuv0;
    let uvDeltaPosY2 = yuv2 - yuv0;

    let rInv = uvDeltaPosX1 * uvDeltaPosY2 - uvDeltaPosY1 * uvDeltaPosX2;
    let r = 1.0 / (Math.abs(rInv < 0.0001) ? 1.0 : rInv);

    // tangent
    let xt = (deltaPosX1 * uvDeltaPosY2 - deltaPosX2 * uvDeltaPosY1) * r;
    let yt = (deltaPosY1 * uvDeltaPosY2 - deltaPosY2 * uvDeltaPosY1) * r;
    let zt = (deltaPosZ1 * uvDeltaPosY2 - deltaPosZ2 * uvDeltaPosY1) * r;

    // bitangent
    let xb = (deltaPosX2 * uvDeltaPosX1 - deltaPosX1 * uvDeltaPosX2) * r;
    let yb = (deltaPosY2 * uvDeltaPosX1 - deltaPosY1 * uvDeltaPosX2) * r;
    let zb = (deltaPosZ2 * uvDeltaPosX1 - deltaPosZ1 * uvDeltaPosX2) * r;

    // orthogonalize
    let xn0 = normals[i0 * 3 + 0];
    let yn0 = normals[i0 * 3 + 1];
    let zn0 = normals[i0 * 3 + 2];

    let xn1 = normals[i1 * 3 + 0];
    let yn1 = normals[i1 * 3 + 1];
    let zn1 = normals[i1 * 3 + 2];

    let xn2 = normals[i2 * 3 + 0];
    let yn2 = normals[i2 * 3 + 1];
    let zn2 = normals[i2 * 3 + 2];

    // tangent
    let xTangent0 = xt - xn0 * (xt * xn0 + yt * yn0 + zt * zn0);
    let yTangent0 = yt - yn0 * (xt * xn0 + yt * yn0 + zt * zn0);
    let zTangent0 = zt - zn0 * (xt * xn0 + yt * yn0 + zt * zn0);

    let xTangent1 = xt - xn1 * (xt * xn1 + yt * yn1 + zt * zn1);
    let yTangent1 = yt - yn1 * (xt * xn1 + yt * yn1 + zt * zn1);
    let zTangent1 = zt - zn1 * (xt * xn1 + yt * yn1 + zt * zn1);

    let xTangent2 = xt - xn2 * (xt * xn2 + yt * yn2 + zt * zn2);
    let yTangent2 = yt - yn2 * (xt * xn2 + yt * yn2 + zt * zn2);
    let zTangent2 = zt - zn2 * (xt * xn2 + yt * yn2 + zt * zn2);

    let magTangent0 = Math.sqrt(xTangent0 * xTangent0 + yTangent0 * yTangent0 + zTangent0 * zTangent0);
    let magTangent1 = Math.sqrt(xTangent1 * xTangent1 + yTangent1 * yTangent1 + zTangent1 * zTangent1);
    let magTangent2 = Math.sqrt(xTangent2 * xTangent2 + yTangent2 * yTangent2 + zTangent2 * zTangent2);

    // bitangent
    let N0oBt = xb * xn0 + yb * yn0 + zb * zn0;
    let N1oBt = xb * xn1 + yb * yn1 + zb * zn1;
    let N2oBt = xb * xn2 + yb * yn2 + zb * zn2;

    let magBitangent0 = Math.sqrt(
      (xb - xn0 * N0oBt) * 2 +
      (yb - yn0 * N0oBt) * 2 +
      (zb - zn0 * N0oBt) * 2
    );
    let magBitangent1 = Math.sqrt(
      (xb - xn1 * N1oBt) * 2 +
      (yb - yn1 * N1oBt) * 2 +
      (zb - zn1 * N1oBt) * 2
    );
    let magBitangent2 = Math.sqrt(
      (xb - xn2 * N2oBt) * 2 +
      (yb - yn2 * N2oBt) * 2 +
      (zb - zn2 * N2oBt) * 2
    );

    tangents[i0 * 3 + 0] += xTangent0 / magTangent0;
    tangents[i0 * 3 + 1] += yTangent0 / magTangent0;
    tangents[i0 * 3 + 2] += zTangent0 / magTangent0;

    tangents[i1 * 3 + 0] += xTangent1 / magTangent1;
    tangents[i1 * 3 + 1] += yTangent1 / magTangent1;
    tangents[i1 * 3 + 2] += zTangent1 / magTangent1;

    tangents[i2 * 3 + 0] += xTangent2 / magTangent2;
    tangents[i2 * 3 + 1] += yTangent2 / magTangent2;
    tangents[i2 * 3 + 2] += zTangent2 / magTangent2;

    bitangents[i0 * 3 + 0] += (xb - xn0 * N0oBt) / magBitangent0;
    bitangents[i0 * 3 + 1] += (yb - yn0 * N0oBt) / magBitangent0;
    bitangents[i0 * 3 + 2] += (zb - zn0 * N0oBt) / magBitangent0;

    bitangents[i1 * 3 + 0] += (xb - xn1 * N1oBt) / magBitangent1;
    bitangents[i1 * 3 + 1] += (yb - yn1 * N1oBt) / magBitangent1;
    bitangents[i1 * 3 + 2] += (zb - zn1 * N1oBt) / magBitangent1;

    bitangents[i2 * 3 + 0] += (xb - xn2 * N2oBt) / magBitangent2;
    bitangents[i2 * 3 + 1] += (yb - yn2 * N2oBt) / magBitangent2;
    bitangents[i2 * 3 + 2] += (zb - zn2 * N2oBt) / magBitangent2;
  };

  return { tangents, bitangents };
};
