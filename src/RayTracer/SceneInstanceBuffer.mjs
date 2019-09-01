import { ASSERT_VK_RESULT } from "../utils.mjs";

import Buffer from "../Buffer.mjs";

import GeometryLayout from "./layouts/GeometryLayout.mjs";

/**
 * Stores all scene's geometry into flatten buffers
 */
export default class SceneInstanceBuffer {
  constructor(opts = {}) {
    this.buffer = null;
    this.logicalDevice = opts.logicalDevice;
    this.physicalDevice = opts.physicalDevice;
  }
};

SceneInstanceBuffer.prototype.create = function(geometries, materials, instances) {
  let {logicalDevice, physicalDevice} = this;

  // create instance buffer for top-level AS
  let geometryInstance = new GeometryLayout();
  let geometryInstanceBuffer = new Uint8Array(instances.length * geometryInstance.byteLength);

  if (instances.length >= 2 ** 24) {
    throw new RangeError(`Instance Index Overflow: The maximum amount of instances is 2^24`);
  }

  let offset = 0x0;
  for (let ii = 0; ii < instances.length; ++ii) {
    let {geometry, material, transform} = instances[ii];
    let geometryId = geometries.indexOf(geometry) & 0xFF;
    let materialId = materials.indexOf(material) & 0xFFFF;
    geometryInstance.set("mask", 0xFF);
    geometryInstance.set("flags", VK_GEOMETRY_INSTANCE_TRIANGLE_CULL_DISABLE_BIT_NV);
    geometryInstance.set("transform", transform);
    // instanceID is 24bit
    {
      let instanceId = geometryInstance.layout["instanceId"];
      instanceId[0] = (ii & 0x000000FF) >> 0;
      instanceId[1] = (ii & 0x0000FF00) >> 8;
      instanceId[2] = (ii & 0x00FF0000) >> 16;
    }
    geometryInstance.set("instanceOffset", 0x0);
    geometryInstance.set("accelerationStructureHandle", geometry.accelerationStructure.handle);
    geometryInstanceBuffer.set(geometryInstance.view, offset);
    offset += geometryInstance.byteLength;
  };

  let instanceBuffer = new Buffer({ logicalDevice, physicalDevice });
  instanceBuffer.allocate(
    geometryInstanceBuffer,
    VK_BUFFER_USAGE_TRANSFER_SRC_BIT,
    VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT
  );

  let stagedInstanceBuffer = new Buffer({ logicalDevice, physicalDevice });
  stagedInstanceBuffer.allocate(
    instanceBuffer.byteLength,
    // aka: SSBO for RT
    VK_BUFFER_USAGE_TRANSFER_DST_BIT |
    VK_BUFFER_USAGE_STORAGE_BUFFER_BIT |
    VK_BUFFER_USAGE_RAY_TRACING_BIT_NV,
    VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT
  );

  instanceBuffer.copyToBuffer(stagedInstanceBuffer, 0x0, 0x0, instanceBuffer.byteLength);

  // and finally free the host visible buffers
  instanceBuffer.destroy();

  this.buffer = stagedInstanceBuffer;
};
