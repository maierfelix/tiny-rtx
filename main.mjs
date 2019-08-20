import RayTracingDemo from "./src/index.mjs";

const ASSET_PATH = "./assets/";
const MODEL_PATH = "models/";
const TEXTURE_PATH = "textures/";

(async function main() {

  let {MATERIAL_MODEL} = RayTracingDemo; // different material models
  let {INDEX_OF_REFRACTION} = RayTracingDemo; // indices for refraction

  let Demo = new RayTracingDemo();

  await Demo.create();

  /* Load all required Geometries*/
  let Box = Demo.loadGeometryFile(ASSET_PATH + MODEL_PATH + "box.obj");
  let Cube = Demo.loadGeometryFile(ASSET_PATH + MODEL_PATH + "cube.obj");
  let Plane = Demo.loadGeometryFile(ASSET_PATH + MODEL_PATH + "plane.obj");
  let Sphere = Demo.loadGeometryFile(ASSET_PATH + MODEL_PATH + "sphere.obj");
  let CubeEdges = Demo.loadGeometryFile(ASSET_PATH + MODEL_PATH + "cube-edges.obj");

  /* Load all required Textures */
  //let BambooTexture = Demo.loadTextureFile(ASSET_PATH + TEXTURE_PATH + "bamboo-wood-semigloss/albedo.png");

  /* Create all Geometry instances */

  /* Generate a scene with random metal and glowing balls */

  Sphere.addInstance({
    transform: new Float32Array([
      2.5, 0.0, 0.0, 4.0,
      0.0, 2.5, 0.0, -2.0,
      0.0, 0.0, 2.5, 0.0
    ]),
    material: Demo.addMaterial({
      color: new Float32Array([1.0, 1.0, 1.0]),
      materialModel: MATERIAL_MODEL.METALLIC,
      IOR: 0.09175
    })
  });

  Cube.addInstance({
    transform: new Float32Array([
      1.75, 0.0, 0.0, 4.0,
      0.0, 3.5, 0.0, -4.475,
      0.0, 0.0, 1.75, -4.0
    ]),
    material: Demo.addMaterial({
      color: new Float32Array([1.0, 1.0, 1.0]),
      materialModel: MATERIAL_MODEL.METALLIC,
      IOR: 0.01175
    })
  });

  Cube.addInstance({
    transform: new Float32Array([
      1.75, 0.0, 0.0, 4.0,
      0.0, 0.01, 0.0, -7.975,
      0.0, 0.0, 1.75, -4.0
    ]),
    material: Demo.addMaterial({
      color: new Float32Array([0.0, 2.0, 3.0]),
      materialModel: MATERIAL_MODEL.EMISSIVE,
      IOR: 0.0
    })
  });

  Cube.addInstance({
    transform: new Float32Array([
      1.75, 0.0, 0.0, 4.0,
      0.0, 0.01, 0.0, -7.975,
      0.0, 0.0, 1.75, 4.0
    ]),
    material: Demo.addMaterial({
      color: new Float32Array([0.0, 2.0, 3.0]),
      materialModel: MATERIAL_MODEL.EMISSIVE,
      IOR: 0.0
    })
  });

  // "cornell box"
  Box.addInstance({
    transform: new Float32Array([
      8.0, 0.0, 0.0, 0.0,
      0.0, 8.0, 0.0, 0.0,
      0.0, 0.0, 8.0, 0.0
    ]),
    material: Demo.addMaterial({
      color: new Float32Array([0.55, 0.55, 0.55]),
      materialModel: MATERIAL_MODEL.METALLIC,
      IOR: 0.000125
    })
  });
  CubeEdges.addInstance({
    transform: new Float32Array([
      8.01, 0.0, 0.0, 0.0,
      0.0, 8.01, 0.0, 0.0,
      0.0, 0.0, 8.01, 0.0
    ]),
    material: Demo.addMaterial({
      color: new Float32Array([0.0, 2.0, 3.0]),
      materialModel: MATERIAL_MODEL.EMISSIVE,
      IOR: 0.0
    })
  });

  Box.addInstance({
    transform: new Float32Array([
      0.1, 0.0, 0.0, -64.0,
      0.0, 6.0, 0.0, 0.0,
      0.0, 0.0, 6.0, 0.0
    ]),
    material: Demo.addMaterial({
      color: new Float32Array([0.0, 2.0, 3.0]),
      materialModel: MATERIAL_MODEL.EMISSIVE,
      IOR: 0.0
    })
  });

  // add some random light balls to the scene
  for (let ii = 0; ii < 16; ++ii) {
    let z = ii;
    // string
    Cube.addInstance({
      transform: new Float32Array([
        0.0275, 0.0, 0.0, -64,
        0.0, 1024.0, 0.0, 512.0,
        0.0, 0.0, 0.0275, z - 8
      ]),
      material: Demo.addMaterial({
        color: new Float32Array([0.0, 2.0, 3.0]),
        materialModel: MATERIAL_MODEL.EMISSIVE,
        IOR: 0.0
      })
    });
  };

  /* Run the ray tracer */
  Demo.execute();

})();
