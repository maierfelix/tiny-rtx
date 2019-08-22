import { __dirname } from "./src/utils.mjs";

import RayTracingDemo from "./src/index.mjs";

const ASSET_PATH = __dirname + "assets/";
const MODEL_PATH = "models/";
const TEXTURE_PATH = "textures/";

(async function main() {

  let {MATERIAL_MODEL} = RayTracingDemo; // different material models
  let {INDEX_OF_REFRACTION} = RayTracingDemo; // indices for refraction

  let Demo = new RayTracingDemo();

  await Demo.create();

  /* Load all required Geometries*/

  let Head = Demo.loadGeometryFile(ASSET_PATH + MODEL_PATH + "head/untitled.obj");

  /* Load all required Textures */
  let HeadTexture = Demo.loadTextureFile(ASSET_PATH + TEXTURE_PATH + "head/albedo.png");
  //let NormalTexture = Demo.loadTextureFile(ASSET_PATH + TEXTURE_PATH + "head/normal.png");
  //let BambooTexture = Demo.loadTextureFile(ASSET_PATH + TEXTURE_PATH + "bamboo-wood-semigloss/albedo.png");

  /* Load skybox texture */
  Demo.useSkyboxTexture(Demo.loadTextureFile(ASSET_PATH + TEXTURE_PATH + "skybox/misty_pines_4k.png"));

  /* Create all Geometry instances */

  Head.addInstance({
    transform: new Float32Array([
      24.0, 0.0, 0.0, 0.0,
      0.0, 24.0, 0.0, -6.0,
      0.0, 0.0, 24.0, 0.0
    ]),
    material: Demo.addMaterial({
      color: new Float32Array([0.0, 0.0, 0.0]),
      materialModel: MATERIAL_MODEL.DIELECTRIC,
      IOR: 1.29175,
      texture: HeadTexture
    })
  });

  /* Run the ray tracer */
  Demo.execute();

})();
