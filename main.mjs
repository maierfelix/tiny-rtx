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

  let Cube = Demo.loadGeometryFile(ASSET_PATH + MODEL_PATH + "cube.obj");
  let Sphere = Demo.loadGeometryFile(ASSET_PATH + MODEL_PATH + "sphere.obj");

  /* Load all required Textures */
  let BambooTexture = Demo.loadTextureFile(ASSET_PATH + TEXTURE_PATH + "bamboo-wood-semigloss/albedo.png");
  let BambooNormalTexture = Demo.loadTextureFile(ASSET_PATH + TEXTURE_PATH + "bamboo-wood-semigloss/normal.png");

  /* Load skybox texture */
  Demo.useSkyboxTexture(Demo.loadTextureFile(ASSET_PATH + TEXTURE_PATH + "skybox/misty_pines_2k.png"));

  /* Create all Geometry instances */

  Sphere.addInstance({
    transform: new Float32Array([
      6.0, 0.0, 0.0, -12,
      0.0, 6.0, 0.0, -3.0,
      0.0, 0.0, 6.0, 0.0
    ]),
    material: Demo.addMaterial({
      color: new Float32Array([0.0, 0.0, 0.0]),
      materialModel: MATERIAL_MODEL.DIELECTRIC,
      IOR: 1.29175,
      texture: BambooTexture
    })
  });

  Sphere.addInstance({
    transform: new Float32Array([
      6.0, 0.0, 0.0, 0.0,
      0.0, 6.0, 0.0, -3.0,
      0.0, 0.0, 6.0, 0.0
    ]),
    material: Demo.addMaterial({
      color: new Float32Array([0.5, 0.5, 0.5]),
      materialModel: MATERIAL_MODEL.METALLIC,
      IOR: 0.29175,
      texture: BambooTexture
    })
  });

  Sphere.addInstance({
    transform: new Float32Array([
      6.0, 0.0, 0.0, 12.0,
      0.0, 6.0, 0.0, -3.0,
      0.0, 0.0, 6.0, 0.0
    ]),
    material: Demo.addMaterial({
      color: new Float32Array([0.0, 0.0, 0.0]),
      materialModel: MATERIAL_MODEL.LAMBERTIAN,
      IOR: 0.0,
      texture: BambooTexture
    })
  });

  Sphere.addInstance({
    transform: new Float32Array([
      0.01, 0.0, 0.0, 36.0,
      0.0, 0.01, 0.0, -6.0,
      0.0, 0.0, 0.01, 0.0
    ]),
    material: Demo.addMaterial({
      color: new Float32Array([0.0, 0.0, 0.0]),
      materialModel: MATERIAL_MODEL.LAMBERTIAN,
      IOR: 0.0,
      texture: BambooNormalTexture
    })
  });

  /* Run the ray tracer */
  Demo.execute();

})();
