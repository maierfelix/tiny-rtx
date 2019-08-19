import { ASSERT_VK_RESULT } from "./utils.mjs";

import CommandBuffer from "./CommandBuffer.mjs";

export default class Buffer {
  constructor(opts) {
    this.instance = new VkBuffer();
    this.logicalDevice = opts.logicalDevice;
    this.physicalDevice = (
      opts.physicalDevice ?
      opts.physicalDevice :
      opts.logicalDevice.physicalDevice
    );
    this.memory = new VkDeviceMemory();
    this.data = null;
    this.mapped = null;
    this.byteLength = 0;
  }
};

Buffer.prototype.allocate = function(dataOrByteLength, usageFlags, memoryPropertyFlags) {
  let {instance, memory} = this;
  let {logicalDevice, physicalDevice} = this;
  let device = logicalDevice.instance;

  let data = null;
  let byteLength = 0;
  let byteOffset = 0x0;
  if (dataOrByteLength === null) {
    // do nothing
  }
  else if (Number.isInteger(dataOrByteLength)) {
    data = null;
    byteLength = dataOrByteLength;
  }
  else if (ArrayBuffer.isView(dataOrByteLength)) {
    data = dataOrByteLength.buffer;
    byteLength = dataOrByteLength.byteLength;
    byteOffset = dataOrByteLength.byteOffset;
  }
  else if (dataOrByteLength.constructor === ArrayBuffer) {
    data = dataOrByteLength;
    byteLength = dataOrByteLength.byteLength;
  }

  let bufferInfo = new VkBufferCreateInfo();
  bufferInfo.size = byteLength;
  bufferInfo.usage = usageFlags;
  bufferInfo.sharingMode = VK_SHARING_MODE_EXCLUSIVE;

  result = vkCreateBuffer(device, bufferInfo, null, instance);
  ASSERT_VK_RESULT(result);

  let memoryRequirements = new VkMemoryRequirements();
  vkGetBufferMemoryRequirements(device, instance, memoryRequirements);

  let memoryTypeIndex = physicalDevice.getMemoryTypeIndex(
    memoryRequirements.memoryTypeBits,
    memoryPropertyFlags
  );

  let memoryAllocateInfo = new VkMemoryAllocateInfo();
  memoryAllocateInfo.allocationSize = memoryRequirements.size;
  memoryAllocateInfo.memoryTypeIndex = memoryTypeIndex;

  result = vkAllocateMemory(device, memoryAllocateInfo, null, memory);
  ASSERT_VK_RESULT(result);

  result = vkBindBufferMemory(device, instance, memory, 0n);
  ASSERT_VK_RESULT(result);

  this.data = data;
  this.byteLength = byteLength;

  // copy data to the mapped buffer
  if (data !== null) {
    // map
    let dataPtr = { $: 0n };
    result = vkMapMemory(device, memory, 0n, bufferInfo.size, 0, dataPtr);
    ASSERT_VK_RESULT(result);

    // copy
    let mappedBuffer = ArrayBuffer.fromAddress(dataPtr.$, bufferInfo.size);

    let srcView = new Uint8Array(data).subarray(byteOffset, byteOffset + byteLength);
    let dstView = new Uint8Array(mappedBuffer);
    dstView.set(srcView, 0x0);

    if (srcView.byteLength !== dstView.byteLength) {
      throw new RangeError(`Source-Buffer .byteLength doesn't match with Destination-Buffer .byteLength`);
    }

    this.mapped = mappedBuffer;
  }
  return this;
};

Buffer.prototype.copyToBuffer = function(dstBuffer, srcOffset, dstOffset, byteLength) {
  let {logicalDevice, physicalDevice} = this;

  let srcBuffer = this;

  let commandBuffer = new CommandBuffer({ logicalDevice, physicalDevice });
  commandBuffer.create(VK_COMMAND_BUFFER_LEVEL_PRIMARY);
  commandBuffer.begin();

  // copy attribute buffer over to device-local buffer
  let copyRegion = new VkBufferCopy();
  copyRegion.srcOffset = srcOffset;
  copyRegion.dstOffset = dstOffset;
  copyRegion.size = byteLength;
  vkCmdCopyBuffer(
    commandBuffer.instance,
    srcBuffer.instance,
    dstBuffer.instance,
    1, [copyRegion]
  );

  commandBuffer.end();
  commandBuffer.destroy();
};

Buffer.prototype.unmap = function() {
  let {memory} = this;
  let {logicalDevice} = this;
  let device = logicalDevice.instance;
  vkUnmapMemory(device, memory);
};

Buffer.prototype.destroy = function() {
  let {instance, memory} = this;
  let {logicalDevice} = this;
  let device = logicalDevice.instance;
  vkDestroyBuffer(device, instance, null);
  vkFreeMemory(device, memory, null);
  this.data = null;
  this.mapped = null;
  this.byteLength = 0;
};
