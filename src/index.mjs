import nvk from "nvk";
import tolw from "tolw";
import glMatrix from "gl-matrix";

import { performance } from "perf_hooks";

import { LOG } from "./utils.mjs";
import { __dirname, readPNGFile, readObjectFile } from "./utils.mjs";

import RayTracer from "./RayTracer/index.mjs";
import VulkanApplication from "./VulkanApplication.mjs";

Object.assign(global, nvk);
Object.assign(global, glMatrix);

// input flags
global.VERBOSE = !!(
  process.env.npm_config_verbose_log ||
  process.argv.filter(v => v.match("--verbose-log"))[0]
);

// prefer to use diescrete gpu over integrated gpu
global.PREFER_DISCRETE_GPU = !!(
  process.env.npm_config_prefer_discrete_gpu ||
  process.argv.filter(v => v.match("--prefer-discrete-gpu"))[0]
);

// material models
const MATERIAL_MODEL = {
  EMISSIVE: 0,
  METALLIC: 1,
  DIELECTRIC: 2,
  LAMBERTIAN: 3
};

// source:
// https://en.wikipedia.org/wiki/Refractive_index
const INDEX_OF_REFRACTION = {
  VACUUM: 1.0,
  AIR: 1.000293,
  HELIUM: 1.000036,
  HYDROGEN: 1.000132,
  CARBON_DIOXIDE: 1.00045,
  // Liquids at 20 °C
  WATER: 1.333,
  ETHANOL: 1.36,
  OLIVE_OIL: 1.47,
  // Solids
  ICE: 1.31,
  QUARTZ: 1.46,
  PMMA: 1.49,
  WINDOW_GLASS: 1.52,
  POLYCARBONATE: 1.58,
  FLINT_GLASS: 1.62,
  SAPPHIRE: 1.77,
  CUBIC_ZIRCONIA: 2.15,
  DIAMOND: 2.42,
  MOISSANITE: 2.65
};

let desiredSurfaceFormat = VK_FORMAT_B8G8R8A8_UNORM;

let requiredExtensions = [
  VK_KHR_SWAPCHAIN_EXTENSION_NAME,
  VK_NV_RAY_TRACING_EXTENSION_NAME,
  VK_KHR_GET_MEMORY_REQUIREMENTS_2_EXTENSION_NAME,
  VK_EXT_DESCRIPTOR_INDEXING_EXTENSION_NAME,
  VK_KHR_MAINTENANCE3_EXTENSION_NAME
];

let validationLayers = [
  "VK_LAYER_LUNARG_core_validation",
  "VK_LAYER_LUNARG_standard_validation",
  "VK_LAYER_LUNARG_parameter_validation"
];

class RayTracingDemo extends VulkanApplication {
  constructor() {
    super({ validationLayers, requiredExtensions, desiredSurfaceFormat });
    this.deviceName = "";
    this.rayTracer = null;
  }
};

RayTracingDemo.prototype.initialise = function() {
  LOG("Initializing TinyObjLoader (WebAssembly)");
  return tolw.init();
};

RayTracingDemo.prototype.create = async function() {
  LOG("Initializing TinyObjLoader (WebAssembly)");
  await tolw.init();
  LOG("Creating window");
  this.window = this.createWindow();
  LOG("Creating Instance");
  this.instance = this.createInstance();
  LOG("Creating Physical Device");
  this.physicalDevice = this.createPhysicalDevice();
  {
    let deviceProperties = this.physicalDevice.getDeviceProperties();
    let {type, properties} = deviceProperties;
    this.deviceName = `${properties.deviceName} (${type})`;
    LOG(`Using Device: ${this.deviceName}`);
  }
  LOG("Creating Logical Device");
  this.logicalDevice = this.createLogicalDevice();
  LOG("Creating Surface");
  this.surface = this.createSurface();
  LOG("Creating Swapchain");
  this.swapchain = this.createSwapchain();
  LOG("Instantiating RayTracer");
  this.rayTracer = this.createRayTracer();
};

RayTracingDemo.prototype.execute = function() {
  let drag = false;
  let {window, rayTracer} = this;
  LOG("Executing RayTracer");
  rayTracer.create();
  let {camera} = rayTracer;
  // add window event listeners
  {
    window.onmousedown = e => (drag = true);
    window.onmouseup = e => (drag = false);
    window.onmousemove = e => {
      if (!drag) return;
      camera.rotation.vx += -e.movementX * 0.725;
      camera.rotation.vy += -e.movementY * 0.725;
      camera.resetSampleCount();
    };
    window.onmousewheel = e => {
      let {deltaY} = e;
      camera.distance.vz += deltaY;
      camera.resetSampleCount();
    };
  }
  // draw loop
  let app = this;
  let then = 0;
  let frames = 0;
  (function drawLoop() {
    if (!window.shouldClose()) setTimeout(drawLoop, 0);
    let now = performance.now();
    let delta = (now - then);
    if (delta > 1.0 || frames === 0) {
      let fps = Math.floor((frames / delta) * 1e3);
      window.title = `Vulkan RTX - ${app.deviceName} - FPS: ${fps} - Samples: ${camera.totalSampleCount}`;
      frames = 0;
    }
    frames++;
    app.drawFrame();
    camera.update();
    then = now;
    window.pollEvents();
  })();
};

RayTracingDemo.prototype.loadGeometryFile = function(path) {
  let ext = path.substr(path.lastIndexOf("."));
  if (ext !== ".obj") console.warn(`This Demo only supports Wavefront OBJ (.obj) as object files`);
  return this.addGeometryMesh(readObjectFile(path));
};

RayTracingDemo.prototype.loadTextureFile = function(path) {
  let ext = path.substr(path.lastIndexOf("."));
  if (ext !== ".png") console.warn(`This Demo only supports PNG (.png) as image files`);
  return this.rayTracer.addTexture(readPNGFile(path));
};

RayTracingDemo.prototype.addGeometryMesh = function(geometry) {
  return this.rayTracer.addGeometry(geometry);
};

RayTracingDemo.prototype.addMaterial = function(material) {
  return this.rayTracer.addMaterial(material);
};

RayTracingDemo.prototype.drawFrame = function() {
  this.drawDefaultFrame();
};

RayTracingDemo.prototype.createRayTracer = function() {
  let {swapchain, surface, window, logicalDevice, physicalDevice} = this;
  let rayTracer = new RayTracer({ swapchain, surface, window, logicalDevice, physicalDevice });
  return rayTracer;
};

RayTracingDemo.MATERIAL_MODEL = MATERIAL_MODEL;
RayTracingDemo.INDEX_OF_REFRACTION = INDEX_OF_REFRACTION;

export default RayTracingDemo;
