import { ASSERT_VK_RESULT } from "../utils.mjs";

import Buffer from "../Buffer.mjs";

/**
 * This buffer contains indices to index the geometry, material and geometry-instance buffers
 * It gets indexed using the 'instanceID' attribute in the 'GeometryInstance' layout
 */
export default class SceneInstanceOffsetBuffer {
  constructor(opts = {}) {
    this.offsets = [];
    this.logicalDevice = opts.logicalDevice;
    this.physicalDevice = opts.physicalDevice;
  }
};

SceneInstanceOffsetBuffer.prototype.create = function(geometries, materials, instances) {
  let {logicalDevice, physicalDevice} = this;
  let {offsets} = this;
  for (let ii = 0; ii < instances.length; ++ii) {
    let {geometry, material} = instances[ii];
    // buffer indices
    let instanceIndex = ii;
    let geometryIndex = geometries.indexOf(geometry);
    let materialIndex = materials.indexOf(material);
    let offsetBuffer = this.createOffsetBuffer(instanceIndex, geometryIndex, materialIndex);
    offsets.push(offsetBuffer);
  };
};

SceneInstanceOffsetBuffer.prototype.createOffsetBuffer = function(instanceIndex, geometryIndex, materialIndex) {
  let {logicalDevice, physicalDevice} = this;

  let offsetBuffer = new Buffer({ logicalDevice, physicalDevice });
  offsetBuffer.allocate(
    new Uint32Array(4),
    VK_BUFFER_USAGE_TRANSFER_SRC_BIT,
    VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT
  );

  // write indices
  let offset = 0x0;
  let instanceOffsets = new Uint32Array(offsetBuffer.mapped);
  instanceOffsets[offset++] = geometryIndex;
  instanceOffsets[offset++] = materialIndex;
  instanceOffsets[offset++] = 0;
  instanceOffsets[offset++] = 0;

  let stagedOffsetBuffer = new Buffer({ logicalDevice, physicalDevice });
  stagedOffsetBuffer.allocate(
    offsetBuffer.byteLength,
    VK_BUFFER_USAGE_TRANSFER_DST_BIT |
    VK_BUFFER_USAGE_STORAGE_BUFFER_BIT |
    VK_BUFFER_USAGE_RAY_TRACING_BIT_NV,
    VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT
  );

  offsetBuffer.copyToBuffer(stagedOffsetBuffer, 0x0, 0x0, offsetBuffer.byteLength);

  // and finally free the host visible buffers
  offsetBuffer.destroy();

  return stagedOffsetBuffer;
};
