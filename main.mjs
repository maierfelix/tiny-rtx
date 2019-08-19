import RayTracingDemo from "./src/index.mjs";

const ASSET_PATH = "./assets/";
const MODEL_PATH = "models/";

let Textures = {}; // TODO
let Geometries = {};

(async function main() {

  let {MATERIAL_MODEL} = RayTracingDemo; // different material models
  let {INDEX_OF_REFRACTION} = RayTracingDemo; // indices for refraction

  let Demo = new RayTracingDemo();

  await Demo.create();

  /* Load all required Geometries*/
  let Plane = Demo.loadGeometryFile(ASSET_PATH + MODEL_PATH + "plane.obj");
  let Sphere = Demo.loadGeometryFile(ASSET_PATH + MODEL_PATH + "sphere.obj");

  /* Create all Geometry instances */

  // add floor
  Plane.addInstance({
    transform: new Float32Array([
      64.0, 0.0, 0.0, 0.0,
      0.0, 64.0, 0.0, -8.75,
      0.0, 0.0, 64.0, 0.0
    ]),
    material: Demo.addMaterial({
      color: new Float32Array([0.1, 0.1, 0.1]),
      materialModel: MATERIAL_MODEL.METALLIC,
      IOR: 0.1325
    })
  });

  /* Generate a scene with random metal and glowing balls */

  let lbit = 1.75; // light ball glow intensity

  for (let xx = 0; xx < 8 + 1; ++xx) {
    for (let zz = 0; zz < 8 + 1; ++zz) {
      // glowing
      if ((xx * zz) % 4 === 0 && (xx + zz) % 4 === 0) {
        // glowing ball
        Sphere.addInstance({
          transform: new Float32Array([
            1.25, 0.0, 0.0, (xx - 4.0) * 4.0,
            0.0, 1.25, 0.0, -4.0,
            0.0, 0.0, 1.25, (zz - 4.0) * 4.0
          ]),
          material: Demo.addMaterial({
            color: new Float32Array([Math.random() * lbit, Math.random() * lbit, Math.random() * lbit]),
            materialModel: MATERIAL_MODEL.EMISSIVE,
            IOR: 0.0 // ignored for emissive
          })
        });
      // metal
      } else {
        let material = Demo.addMaterial({
          color: new Float32Array([0.175, 0.175, 0.175]),
          materialModel: MATERIAL_MODEL.METALLIC,
          IOR: 1.0 - (xx * 8 + zz) / (8 * 8) // for metal, IOR is interpreted as the metal's "fuzziness"
        });
        Sphere.addInstance({
          transform: new Float32Array([
            1.5, 0.0, 0.0, (xx - 4.0) * 4.0,
            0.0, 1.5, 0.0, -7.2125,
            0.0, 0.0, 1.5, (zz - 4.0) * 4.0
          ]),
          material
        });
      }
    };
  };

  // add some random light balls to the scene
  for (let ii = 0; ii < 32; ++ii) {
    let xx = Math.random() * 32 - 16;
    let zz = Math.random() * 32 - 16;
    // glass ball
    Sphere.addInstance({
      transform: new Float32Array([
        1.0, 0.0, 0.0, xx + (Math.abs(xx) * Math.random() * 48.0) * (1.0 / xx),
        0.0, 1.0, 0.0, -7.75,
        0.0, 0.0, 1.0, zz + (Math.abs(zz) * Math.random() * 48.0) * (1.0 / zz),
      ]),
      material: Demo.addMaterial({
        color: new Float32Array([0.996, 0.916, 0.8058]),
        materialModel: MATERIAL_MODEL.EMISSIVE,
        IOR: 0.0
      })
    });
  };

  /* Run the ray tracer */
  Demo.execute();

})();
