import { ASSERT_VK_RESULT } from "../utils.mjs";

export default class AccelerationStructure {
  constructor(opts = {}) {
    this.instance = new VkAccelerationStructureNV();
    this.type = 0;
    this.instanceCount = 0;
    this.memoryOffset = 0;
    this.scratchBuffer = null;
    this.scratchBufferOffset = 0;
    this.instanceBuffer = null;
    this.geometries = [];
    this.geometryInstance = null;
    this.logicalDevice = opts.logicalDevice;
    this.physicalDevice = opts.physicalDevice;
  }
  get handle() {
    let {instance, logicalDevice} = this;
    let dataPtr = { $: 0n };
    let handle = new BigInt64Array([dataPtr.$]);
    result = vkGetAccelerationStructureHandleNV(logicalDevice.instance, instance, handle.constructor.BYTES_PER_ELEMENT, handle.buffer);
    ASSERT_VK_RESULT(result);
    return handle.buffer;
  }
  get memoryRequirements() {
    let {instance, logicalDevice} = this;

    let memoryRequirementsInfo = new VkAccelerationStructureMemoryRequirementsInfoNV();
    memoryRequirementsInfo.accelerationStructure = instance;

    let memoryRequirements = new VkMemoryRequirements2();

    // result requirements
    memoryRequirementsInfo.type = VK_ACCELERATION_STRUCTURE_MEMORY_REQUIREMENTS_TYPE_OBJECT_NV;
    vkGetAccelerationStructureMemoryRequirementsNV(logicalDevice.instance, memoryRequirementsInfo, memoryRequirements);
    let resultSize = Number(memoryRequirements.memoryRequirements.size);

    // build requirements
    memoryRequirementsInfo.type = VK_ACCELERATION_STRUCTURE_MEMORY_REQUIREMENTS_TYPE_BUILD_SCRATCH_NV;
    vkGetAccelerationStructureMemoryRequirementsNV(logicalDevice.instance, memoryRequirementsInfo, memoryRequirements);
    let buildSize = Number(memoryRequirements.memoryRequirements.size);

    // update requirements
    memoryRequirementsInfo.type = VK_ACCELERATION_STRUCTURE_MEMORY_REQUIREMENTS_TYPE_UPDATE_SCRATCH_NV;
    vkGetAccelerationStructureMemoryRequirementsNV(logicalDevice.instance, memoryRequirementsInfo, memoryRequirements);
    let updateSize = Number(memoryRequirements.memoryRequirements.size);

    return { resultSize, buildSize, updateSize };
  }
};

AccelerationStructure.prototype.create = function({ type, geometries = [], instanceCount = 0 }) {
  let {instance} = this;
  let {logicalDevice} = this;
  let device = logicalDevice.instance;

  this.type = type;
  this.instanceCount = instanceCount;
  this.geometries = geometries;

  let accelerationStructureInfo = new VkAccelerationStructureCreateInfoNV();
  accelerationStructureInfo.compactedSize = 0;
  accelerationStructureInfo.info.type = type;
  accelerationStructureInfo.info.flags = VK_BUILD_ACCELERATION_STRUCTURE_PREFER_FAST_TRACE_BIT_NV;
  accelerationStructureInfo.info.instanceCount = instanceCount;
  accelerationStructureInfo.info.geometryCount = geometries.length;
  accelerationStructureInfo.info.pGeometries = geometries.map(g => g.geometry);

  result = vkCreateAccelerationStructureNV(device, accelerationStructureInfo, null, instance);
  ASSERT_VK_RESULT(result);
};

AccelerationStructure.prototype.bind = function({ scratchBuffer }) {
  let {instance} = this;
  let {logicalDevice} = this;
  let device = logicalDevice.instance;

  let {memory} = scratchBuffer.levelBuffer;
  let {memoryOffset} = this;

  let memoryBindInfo = new VkBindAccelerationStructureMemoryInfoNV();
  memoryBindInfo.accelerationStructure = instance;
  memoryBindInfo.memory = memory;
  memoryBindInfo.memoryOffset = memoryOffset;
  memoryBindInfo.deviceIndexCount = 0;
  memoryBindInfo.pDeviceIndices = null;

  result = vkBindAccelerationStructureMemoryNV(device, 1, [memoryBindInfo]);
  ASSERT_VK_RESULT(result);

  this.scratchBuffer = scratchBuffer;
};

AccelerationStructure.prototype.destroy = function() {

};
