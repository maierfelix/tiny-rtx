import { ASSERT_VK_RESULT } from "../utils.mjs";

import Buffer from "../Buffer.mjs";

export default class ScratchBuffer {
  constructor(opts = {}) {
    this.instance = null;
    this.buffer = null;
    this.levelBuffer = null;
    this.logicalDevice = opts.logicalDevice;
  }
};

ScratchBuffer.prototype.create = function(accelerationStructures) {
  let {logicalDevice} = this;
  let device = logicalDevice.instance;

  let total = {
    resultSize: 0,
    buildSize: 0,
    updateSize: 0
  };

  // find how much memory we have to reserve for the passed in ASs
  for (let ii = 0; ii < accelerationStructures.length; ++ii) {
    let {memoryRequirements} = accelerationStructures[ii];
    total.resultSize += memoryRequirements.resultSize;
    total.buildSize += memoryRequirements.buildSize;
    total.updateSize += memoryRequirements.buildSize;
  };

  let levelBuffer = new Buffer({ logicalDevice });
  levelBuffer.allocate(
    total.resultSize,
    VK_BUFFER_USAGE_RAY_TRACING_BIT_NV,
    VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT
  );

  let buffer = new Buffer({ logicalDevice });
  buffer.allocate(
    total.buildSize,
    VK_BUFFER_USAGE_RAY_TRACING_BIT_NV,
    VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT
  );

  this.buffer = buffer;
  this.levelBuffer = levelBuffer;
  this.instance = buffer.instance;

  // bind scratch-buffer to each AS's instance
  for (let ii = 0; ii < accelerationStructures.length; ++ii) {
    let accelerationStructure = accelerationStructures[ii];
    // bind AS to this scratch buffer's memory at the given offset
    accelerationStructure.bind({ scratchBuffer: this });
  };
};

ScratchBuffer.prototype.destroy = function() {
  if (this.buffer) {
    this.buffer.destroy();
    this.buffer = null;
  }
  if (this.levelBuffer) {
    this.levelBuffer.destroy();
    this.levelBuffer = null;
  }
};
