import { LOG, ASSERT_VK_RESULT } from "../utils.mjs";

import { dirname } from "../utils.mjs";

import Camera from "./Camera.mjs";
import Pipeline from "./Pipeline.mjs";

import Buffer from "../Buffer.mjs";
import ShaderModule from "../ShaderModule.mjs";
import CommandBuffer from "../CommandBuffer.mjs";

import ScratchBuffer from "./ScratchBuffer.mjs";
import ShaderBindingTable from "./ShaderBindingTable.mjs";

import OffscreenBuffer from "./OffscreenBuffer.mjs";
import AccumulationBuffer from "./AccumulationBuffer.mjs";
import SceneTextureBuffer from "./SceneTextureBuffer.mjs";
import SceneGeometryBuffer from "./SceneGeometryBuffer.mjs";
import SceneInstanceBuffer from "./SceneInstanceBuffer.mjs";
import SceneInstanceOffsetBuffer from "./SceneInstanceOffsetBuffer.mjs";

import AccelerationGeometry from "./AccelerationGeometry.mjs";
import AccelerationStructure from "./AccelerationStructure.mjs";

const MAX_RAY_RECURSION = 4;

export default class RayTracer {
  constructor(opts = {}) {
    this.application = opts.application;
    this.logicalDevice = opts.logicalDevice;
    this.physicalDevice = opts.physicalDevice;
    this.window = opts.window;
    this.surface = opts.surface;
    this.swapchain = opts.swapchain;
    this.shaders = [];
    this.camera = null;
    this.offscreenBuffer = null;
    this.accumulationBuffer = null;
    this.shaderBindingTable = null;
    this.sceneTextureBuffer = null;
    this.sceneGeometryBuffer = null;
    this.sceneInstanceOffsetBuffer = null;
    this.pipeline = null;
    this.geometries = [];
    this.materials = [];
    this.textures = [];
    this.accelerationStructures = {
      top: [],
      bottom: []
    };
  }

  get instances() {
    let {geometries} = this;
    let instances = [];
    for (let ii = 0; ii < geometries.length; ++ii) {
      let geometry = geometries[ii];
      for (let jj = 0; jj < geometry.instances.length; ++jj) {
        instances.push(geometry.instances[jj]);
      };
    };
    return instances;
  }

  get materialTextures() {
    let {materials} = this;
    let textures = [];
    for (let ii = 0; ii < materials.length; ++ii) {
      let {texture} = materials[ii];
      if (!texture) continue;
      if (textures.indexOf(texture) <= -1) textures.push(texture);
    };
    return textures;
  }

};

RayTracer.prototype.create = function() {
  LOG("Creating Scene Texture Buffer");
  this.sceneTextureBuffer = this.createSceneTextureBuffer();
  LOG("Creating Scene Geometry Buffer");
  this.sceneGeometryBuffer = this.createSceneGeometryBuffer();
  LOG("Creating Scene Instance Offset Buffer");
  this.sceneInstanceOffsetBuffer = this.createSceneInstanceOffsetBuffer();
  LOG("Creating Bottom-Level Acceleration Structures");
  this.createBottomLevelAccelerationStructures();
  LOG("Creating Top-Level Acceleration Structures");
  this.createTopLevelAccelerationStructure();
  LOG("Creating Camera");
  this.camera = this.createCamera();
  LOG("Creating Shaders");
  this.shaders = this.createShaders();
  LOG("Creating Shader Binding Table");
  this.shaderBindingTable = this.createShaderBindingTable();
  LOG("Creating Offscreen Buffer");
  this.offscreenBuffer = this.createOffscreenBuffer();
  LOG("Creating Accumulation Buffer");
  this.accumulationBuffer = this.createAccumulationBuffer();
  LOG("Building Acceleration Structures");
  this.buildAccelerationStructures();
  LOG("Creating Pipeline");
  this.pipeline = this.createPipeline();
  LOG("Linking Shader Binding Table with Pipeline");
  this.shaderBindingTable.create(this.pipeline.instance);
  LOG("Creating Pipeline Descriptorsets");
  this.pipeline.createDescriptorSets(this.accelerationStructures.top);
  LOG("Recording Draw Commands");
  this.recordDrawCommands();
  LOG("Done");
};

RayTracer.prototype.destroy = function() {

};

RayTracer.prototype.addGeometry = function(mesh) {
  let {logicalDevice, physicalDevice} = this;
  let geometry = new AccelerationGeometry({ logicalDevice, physicalDevice });
  // validate input
  if (!mesh.hasOwnProperty("vertices")) {
    throw new ReferenceError(`Mesh is missing a 'vertices' property`);
  }
  if (!mesh.hasOwnProperty("normals")) {
    throw new ReferenceError(`Mesh is missing a 'normals' property`);
  }
  if (!mesh.hasOwnProperty("tangents")) {
    throw new ReferenceError(`Mesh is missing a 'tangents' property`);
  }
  if (!mesh.hasOwnProperty("uvs")) {
    throw new ReferenceError(`Mesh is missing a 'uvs' property`);
  }
  if (!mesh.hasOwnProperty("indices")) {
    throw new ReferenceError(`Mesh is missing a 'indices' property`);
  }
  // validate types
  if (!(mesh.vertices instanceof Float32Array)) {
    throw new TypeError(`Mesh requires 'vertices' property to be of type 'Float32Array'`);
  }
  if (!(mesh.normals instanceof Float32Array)) {
    throw new TypeError(`Mesh requires 'normals' property to be of type 'Float32Array'`);
  }
  if (!(mesh.tangents instanceof Float32Array)) {
    throw new TypeError(`Mesh requires 'tangents' property to be of type 'Float32Array'`);
  }
  if (!(mesh.uvs instanceof Float32Array)) {
    throw new TypeError(`Mesh requires 'uvs' property to be of type 'Float32Array'`);
  }
  if (!(mesh.indices instanceof Uint32Array)) {
    throw new TypeError(`Mesh requires 'indices' property to be of type 'Uint32Array'`);
  }
  geometry.create(mesh);
  this.geometries.push(geometry);
  return geometry;
};

RayTracer.prototype.addMaterial = function(material) {
  // validate input
  if (!material.hasOwnProperty("color")) {
    throw new ReferenceError(`Material is missing a 'width' property`);
  }
  if (!material.hasOwnProperty("materialModel")) {
    throw new ReferenceError(`Material is missing a 'materialModel' property`);
  }
  if (!material.hasOwnProperty("IOR")) {
    throw new ReferenceError(`Material is missing a 'IOR' property`);
  }
  // validate input types
  if (!(material.color instanceof Float32Array)) {
    throw new TypeError(`Material requires 'color' property to be of type 'Float32Array'`);
  }
  if (!Number.isInteger(material.materialModel)) {
    throw new TypeError(`Material requires 'materialModel' property to be of type 'Integer'`);
  }
  if (!Number.isFinite(material.IOR)) {
    throw new TypeError(`Material requires 'IOR' property to be of type 'Float'`);
  }
  this.materials.push(material);
  return material;
};

RayTracer.prototype.addTexture = function(texture) {
  // validate input
  if (!texture.hasOwnProperty("width")) {
    throw new ReferenceError(`Texture is missing a 'width' property`);
  }
  if (!texture.hasOwnProperty("height")) {
    throw new ReferenceError(`Texture is missing a 'height' property`);
  }
  if (!texture.hasOwnProperty("data")) {
    throw new ReferenceError(`Texture is missing a 'data' property`);
  }
  // validate input types
  if (!Number.isInteger(texture.width)) {
    throw new TypeError(`Texture requires 'width' property to be of type 'Integer'`);
  }
  if (!Number.isInteger(texture.height)) {
    throw new TypeError(`Texture requires 'height' property to be of type 'Integer'`);
  }
  if (!(texture.data instanceof Uint8ClampedArray)) {
    throw new TypeError(`Texture requires 'data' property to be of type 'Uint8ClampedArray'`);
  }
  texture.offset = 0x0;
  this.textures.push(texture);
  return texture;
};

RayTracer.prototype.createCamera = function() {
  let {window, logicalDevice, physicalDevice} = this;
  let camera = new Camera({ window, logicalDevice, physicalDevice });
  camera.create();
  return camera;
};

RayTracer.prototype.createShaders = function() {
  let {logicalDevice} = this;
  let includesPath = dirname + "/assets/shaders/";
  let generation = new ShaderModule({
    entryPoint: "main",
    usage: VK_SHADER_STAGE_RAYGEN_BIT_NV,
    logicalDevice
  }).fromFilePath(dirname + "/assets/shaders/ray-gen.rgen", includesPath);
  let closestHit = new ShaderModule({
    entryPoint: "main",
    usage: VK_SHADER_STAGE_CLOSEST_HIT_BIT_NV,
    logicalDevice
  }).fromFilePath(dirname + "/assets/shaders/ray-closest-hit.rchit", includesPath);
  let miss = new ShaderModule({
    entryPoint: "main",
    usage: VK_SHADER_STAGE_MISS_BIT_NV,
    logicalDevice
  }).fromFilePath(dirname + "/assets/shaders/ray-miss.rmiss", includesPath);
  return [generation, closestHit, miss];
};

RayTracer.prototype.createShaderBindingTable = function() {
  let {logicalDevice, physicalDevice} = this;
  let {shaderGroupHandleSize} = physicalDevice.getDeviceProperties().rayTracing;
  let {shaders} = this;
  let sbt = new ShaderBindingTable({ logicalDevice, physicalDevice, shaders, shaderGroupHandleSize });
  sbt.addStage(VK_SHADER_STAGE_RAYGEN_BIT_NV);
  sbt.addStage(VK_SHADER_STAGE_CLOSEST_HIT_BIT_NV);
  sbt.addStage(VK_SHADER_STAGE_MISS_BIT_NV);
  return sbt;
};

RayTracer.prototype.createOffscreenBuffer = function() {
  let {window, surface, logicalDevice, physicalDevice} = this;
  let offscreenBuffer = new OffscreenBuffer({ logicalDevice, physicalDevice });
  offscreenBuffer.create(window.width, window.height, 1, surface.surfaceFormat.format);
  return offscreenBuffer;
};

RayTracer.prototype.createAccumulationBuffer = function() {
  let {window, logicalDevice, physicalDevice} = this;
  let accumulationBuffer = new AccumulationBuffer({ logicalDevice, physicalDevice });
  accumulationBuffer.create(window.width, window.height);
  return accumulationBuffer;
};

RayTracer.prototype.createPipeline = function() {
  let {logicalDevice} = this;
  let {camera, shaderBindingTable} = this;
  let {offscreenBuffer, accumulationBuffer} = this;
  let {sceneGeometryBuffer, sceneTextureBuffer, sceneInstanceOffsetBuffer} = this;
  let pipeline = new Pipeline({
    logicalDevice,
    shaderBindingTable,
    offscreenBuffer,
    accumulationBuffer,
    sceneGeometryBuffer,
    sceneTextureBuffer,
    sceneInstanceOffsetBuffer
  });
  pipeline.create();
  pipeline.addUniformBuffer(camera);
  return pipeline;
};

RayTracer.prototype.createSceneTextureBuffer = function() {
  let {logicalDevice, physicalDevice} = this;
  let {application} = this;
  let {materialTextures} = this;
  let sceneTextureBuffer = new SceneTextureBuffer({ logicalDevice, physicalDevice });
  sceneTextureBuffer.create(materialTextures, application.skyboxTexture);
  return sceneTextureBuffer;
};

RayTracer.prototype.createSceneGeometryBuffer = function() {
  let {logicalDevice, physicalDevice} = this;
  let {geometries, materials} = this;
  let {materialTextures} = this;
  let sceneGeometryBuffer = new SceneGeometryBuffer({ logicalDevice, physicalDevice });
  sceneGeometryBuffer.create(geometries, materials, materialTextures);
  return sceneGeometryBuffer;
};

RayTracer.prototype.createSceneInstanceOffsetBuffer = function() {
  let {logicalDevice, physicalDevice} = this;
  let {geometries, materials, instances} = this;
  let sceneInstanceOffsetBuffer = new SceneInstanceOffsetBuffer({ logicalDevice, physicalDevice });
  sceneInstanceOffsetBuffer.create(geometries, materials, instances);
  return sceneInstanceOffsetBuffer;
};

RayTracer.prototype.createSceneInstanceBuffer = function(instances) {
  let {logicalDevice, physicalDevice} = this;
  let {geometries, materials} = this;
  let sceneInstanceBuffer = new SceneInstanceBuffer({ logicalDevice, physicalDevice });
  sceneInstanceBuffer.create(geometries, materials, instances);
  return sceneInstanceBuffer;
};

RayTracer.prototype.recordDrawCommands = function() {
  let {window, swapchain, logicalDevice} = this;
  let {drawCommandBuffers} = swapchain;
  let {offscreenBuffer, accumulationBuffer} = this;

  let swapchainImages = swapchain.images;

  let copyRegion = new VkImageCopy();
  copyRegion.srcSubresource.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
  copyRegion.srcSubresource.mipLevel = 0;
  copyRegion.srcSubresource.baseArrayLayer = 0;
  copyRegion.srcSubresource.layerCount = 1;
  copyRegion.dstSubresource.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
  copyRegion.dstSubresource.mipLevel = 0;
  copyRegion.dstSubresource.baseArrayLayer = 0;
  copyRegion.dstSubresource.layerCount = 1;
  copyRegion.extent.depth = 1;
  copyRegion.extent.width = window.width;
  copyRegion.extent.height = window.height;

  let subresourceRange = new VkImageSubresourceRange();
  subresourceRange.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
  subresourceRange.baseMipLevel = 0;
  subresourceRange.levelCount = 1;
  subresourceRange.baseArrayLayer = 0;
  subresourceRange.layerCount = 1;

  let commandBufferBeginInfo = new VkCommandBufferBeginInfo();

  for (let ii = 0; ii < drawCommandBuffers.length; ++ii) {
    let commandBuffer = drawCommandBuffers[ii];
    commandBuffer.begin();
    commandBuffer.setImageBarrier(
      accumulationBuffer.image,
      subresourceRange,
      0, VK_ACCESS_SHADER_WRITE_BIT,
      VK_IMAGE_LAYOUT_UNDEFINED, VK_IMAGE_LAYOUT_GENERAL
    );
    commandBuffer.setImageBarrier(
      offscreenBuffer.image,
      subresourceRange,
      0, VK_ACCESS_SHADER_WRITE_BIT,
      VK_IMAGE_LAYOUT_UNDEFINED, VK_IMAGE_LAYOUT_GENERAL
    );
    this.onFrame(
      commandBuffer,
      window.width, window.height
    );
    commandBuffer.setImageBarrier(
      swapchainImages[ii],
      subresourceRange,
      0, VK_ACCESS_TRANSFER_WRITE_BIT,
      VK_IMAGE_LAYOUT_UNDEFINED, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL
    );
    commandBuffer.setImageBarrier(
      offscreenBuffer.image,
      subresourceRange,
      VK_ACCESS_SHADER_WRITE_BIT, VK_ACCESS_TRANSFER_READ_BIT,
      VK_IMAGE_LAYOUT_GENERAL, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL
    );
    vkCmdCopyImage(
      commandBuffer.instance,
      offscreenBuffer.image,
      VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL,
      swapchainImages[ii],
      VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL,
      1, [copyRegion]
    );
    commandBuffer.setImageBarrier(
      swapchainImages[ii],
      subresourceRange,
      VK_ACCESS_TRANSFER_WRITE_BIT, 0,
      VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, VK_IMAGE_LAYOUT_PRESENT_SRC_KHR
    );
    commandBuffer.end();
  };
};

RayTracer.prototype.createBottomLevelAccelerationStructures = function() {
  let {logicalDevice, physicalDevice} = this;
  let {geometries, accelerationStructures} = this;

  let memoryOffset = 0x0;
  let scratchBufferOffset = 0x0;
  for (let ii = 0; ii < geometries.length; ++ii) {
    let geometry = geometries[ii];
    let bottomLevelAS = new AccelerationStructure({ logicalDevice, physicalDevice });
    // one bottom-level AS for each geometry
    bottomLevelAS.create({ type: VK_ACCELERATION_STRUCTURE_TYPE_BOTTOM_LEVEL_NV, geometries: [geometry] });
    // write memory offsets
    {
      bottomLevelAS.memoryOffset = memoryOffset;
      bottomLevelAS.scratchBufferOffset = scratchBufferOffset;
    }
    // link with relative geometry
    {
      geometry.accelerationStructure = bottomLevelAS;
    }
    // propagate memory offsets
    {
      memoryOffset += bottomLevelAS.memoryRequirements.resultSize;
      scratchBufferOffset += bottomLevelAS.memoryRequirements.buildSize;
    }
    accelerationStructures.bottom.push(bottomLevelAS);
  };

  // reserve memory for driver
  // then bind all created bottom AS (of this geometry) to the reserved memory
  let scratchBuffer = new ScratchBuffer({ logicalDevice, physicalDevice });
  scratchBuffer.create(accelerationStructures.bottom);
};

RayTracer.prototype.createTopLevelAccelerationStructure = function() {
  let {logicalDevice, physicalDevice} = this;
  let {accelerationStructures} = this;

  // flat array of all active geometry instances
  let {instances} = this;

  let memoryOffset = 0x0;
  let scratchBufferOffset = 0x0;
  let topLevelAS = new AccelerationStructure({ logicalDevice, physicalDevice });
  topLevelAS.create({ type: VK_ACCELERATION_STRUCTURE_TYPE_TOP_LEVEL_NV, instanceCount: instances.length });
  // write memory offsets
  {
    topLevelAS.memoryOffset = memoryOffset;
    topLevelAS.scratchBufferOffset = scratchBufferOffset;
  }
  // create instance buffer which holds instanced geometry references
  {
    topLevelAS.instanceBuffer = this.createSceneInstanceBuffer(instances);
  }
  accelerationStructures.top.push(topLevelAS);

  // reserve memory for driver
  let scratchBuffer = new ScratchBuffer({ logicalDevice, physicalDevice });
  scratchBuffer.create([topLevelAS]);
};

RayTracer.prototype.buildAccelerationStructures = function() {
  let {logicalDevice, physicalDevice} = this;
  let {accelerationStructures} = this;

  let commandBuffer = new CommandBuffer({ logicalDevice });
  commandBuffer.create(VK_COMMAND_BUFFER_LEVEL_PRIMARY);
  commandBuffer.begin();

  let memoryBarrier = new VkMemoryBarrier();
  memoryBarrier.srcAccessMask = VK_ACCESS_ACCELERATION_STRUCTURE_WRITE_BIT_NV | VK_ACCESS_ACCELERATION_STRUCTURE_READ_BIT_NV;
  memoryBarrier.dstAccessMask = VK_ACCESS_ACCELERATION_STRUCTURE_WRITE_BIT_NV | VK_ACCESS_ACCELERATION_STRUCTURE_READ_BIT_NV;

  let {top, bottom} = accelerationStructures;

  // build bottom-level AS
  for (let ii = 0; ii < bottom.length; ++ii) {
    let accelerationStructure = bottom[ii];
    let {geometries, instanceCount} = accelerationStructure;
    let {scratchBuffer, scratchBufferOffset} = accelerationStructure;
    let asInfo = new VkAccelerationStructureInfoNV();
    asInfo.type = VK_ACCELERATION_STRUCTURE_TYPE_BOTTOM_LEVEL_NV;
    asInfo.instanceCount = instanceCount;
    asInfo.geometryCount = geometries.length;
    asInfo.pGeometries = geometries.map(g => g.geometry);
    vkCmdBuildAccelerationStructureNV(commandBuffer.instance, asInfo, null, 0, false, accelerationStructure.instance, null, scratchBuffer.instance, scratchBufferOffset);
  };
  vkCmdPipelineBarrier(commandBuffer.instance, VK_PIPELINE_STAGE_ACCELERATION_STRUCTURE_BUILD_BIT_NV, VK_PIPELINE_STAGE_ACCELERATION_STRUCTURE_BUILD_BIT_NV, 0, 1, [memoryBarrier], 0, null, 0, null);

  // build top-level AS
  for (let ii = 0; ii < top.length; ++ii) {
    let accelerationStructure = top[ii];
    let {instanceCount} = accelerationStructure;
    let {scratchBuffer, scratchBufferOffset} = accelerationStructure;
    let asInfo = new VkAccelerationStructureInfoNV();
    asInfo.type = VK_ACCELERATION_STRUCTURE_TYPE_TOP_LEVEL_NV;
    asInfo.instanceCount = instanceCount;
    asInfo.geometryCount = 0;
    asInfo.pGeometries = null;
    vkCmdBuildAccelerationStructureNV(commandBuffer.instance, asInfo, accelerationStructure.instanceBuffer.buffer.instance, 0, false, accelerationStructure.instance, null, scratchBuffer.instance, scratchBufferOffset);
  };
  vkCmdPipelineBarrier(commandBuffer.instance, VK_PIPELINE_STAGE_ACCELERATION_STRUCTURE_BUILD_BIT_NV, VK_PIPELINE_STAGE_ACCELERATION_STRUCTURE_BUILD_BIT_NV, 0, 1, [memoryBarrier], 0, null, 0, null);

  vkEndCommandBuffer(commandBuffer.instance);

  let submitInfo = new VkSubmitInfo();
  submitInfo.commandBufferCount = 1;
  submitInfo.pCommandBuffers = [commandBuffer.instance];

  let graphicsQueue = logicalDevice.getGraphicsQueue();
  vkQueueSubmit(graphicsQueue, 1, [submitInfo], null);
  vkQueueWaitIdle(graphicsQueue);

  commandBuffer.destroy();
};

RayTracer.prototype.onFrame = function(commandBuffer, width, height) {
  let {pipeline, shaderBindingTable} = this;
  let {shaderGroupHandleSize} = shaderBindingTable;
  vkCmdBindPipeline(commandBuffer.instance, VK_PIPELINE_BIND_POINT_RAY_TRACING_NV, pipeline.instance);
  vkCmdBindDescriptorSets(commandBuffer.instance, VK_PIPELINE_BIND_POINT_RAY_TRACING_NV, pipeline.layout, 0, 1, [pipeline.descriptorSet], 0, null);
  vkCmdTraceRaysNV(
    commandBuffer.instance,
    shaderBindingTable.instance, 0 * shaderGroupHandleSize,
    shaderBindingTable.instance, 2 * shaderGroupHandleSize, shaderGroupHandleSize,
    shaderBindingTable.instance, 1 * shaderGroupHandleSize, shaderGroupHandleSize,
    null, 0, 0,
    width, height, 1
  );
};
