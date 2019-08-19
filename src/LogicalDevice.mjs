import { ASSERT_VK_RESULT } from "./utils.mjs";

import { readBinarySPIRVShader } from "./utils.mjs";

export default class LogicalDevice {
  constructor(opts) {
    this.instance = new VkDevice();
    this.physicalDevice = opts.physicalDevice;
    this.queues = {
      compute:  new VkQueue(),
      graphics: new VkQueue(),
      transfer: new VkQueue()
    };
    this.queueFamilyIndices = opts.physicalDevice.getQueueFamilyIndices();
    if (opts.requiredExtensions) this.requiredExtensions = opts.requiredExtensions;
  }
};

LogicalDevice.prototype.create = function() {
  let {instance, physicalDevice} = this;
  let {requiredExtensions, queueFamilyIndices} = this;

  let queueCreateInfos = [];

  if (queueFamilyIndices.computeFamilyIndex !== -1) {
    queueCreateInfos.push(this.createDeviceQueue(queueFamilyIndices.computeFamilyIndex));
  }
  if (queueFamilyIndices.graphicsFamilyIndex !== -1) {
    queueCreateInfos.push(this.createDeviceQueue(queueFamilyIndices.graphicsFamilyIndex));
  }
  if (queueFamilyIndices.transferFamilyIndex !== -1) {
    queueCreateInfos.push(this.createDeviceQueue(queueFamilyIndices.transferFamilyIndex));
  }

  let descriptorIndexing = new VkPhysicalDeviceDescriptorIndexingFeaturesEXT();

  let deviceFeatures2 = new VkPhysicalDeviceFeatures2();
  deviceFeatures2.pNext = descriptorIndexing;

  vkGetPhysicalDeviceFeatures2(physicalDevice.instance, deviceFeatures2);

  let deviceInfo = new VkDeviceCreateInfo();
  deviceInfo.pNext = deviceFeatures2;
  deviceInfo.queueCreateInfoCount = queueCreateInfos.length;
  deviceInfo.pQueueCreateInfos = queueCreateInfos;
  deviceInfo.enabledExtensionCount = requiredExtensions.length;
  deviceInfo.ppEnabledExtensionNames = requiredExtensions;

  result = vkCreateDevice(physicalDevice.instance, deviceInfo, null, instance);
  ASSERT_VK_RESULT(result);

  if (result === VK_SUCCESS) {
    this.createDeviceQueues();
    return true;
  };
  return false;
};

LogicalDevice.prototype.destroy = function() {
  
};

LogicalDevice.prototype.getGraphicsQueue = function() {
  return this.queues.graphics;
};

LogicalDevice.prototype.getComputeQueue = function() {
  return this.queues.compute;
};

LogicalDevice.prototype.getTransferQueue = function() {
  return this.queues.transfer;
};

LogicalDevice.prototype.createDeviceQueue = function(queueFamilyIndex) {
  let {physicalDevice} = this;
  let deviceQueueInfo = new VkDeviceQueueCreateInfo();
  deviceQueueInfo.queueFamilyIndex = queueFamilyIndex;
  deviceQueueInfo.queueCount = 1;
  deviceQueueInfo.pQueuePriorities = new Float32Array([1.0, 1.0, 1.0, 1.0]);
  return deviceQueueInfo;
};

LogicalDevice.prototype.createDeviceQueues = function() {
  let {instance, physicalDevice} = this;
  let {queues, queueFamilyIndices} = this;
  if (queueFamilyIndices.computeFamilyIndex !== -1) {
    vkGetDeviceQueue(instance, queueFamilyIndices.computeFamilyIndex, 0, queues.compute);
  }
  if (queueFamilyIndices.graphicsFamilyIndex !== -1) {
    vkGetDeviceQueue(instance, queueFamilyIndices.graphicsFamilyIndex, 0, queues.graphics);
  }
  if (queueFamilyIndices.transferFamilyIndex !== -1) {
    vkGetDeviceQueue(instance, queueFamilyIndices.transferFamilyIndex, 0, queues.transfer);
  }
};

LogicalDevice.prototype.allocateBuffer = function(byteLength, usage, memoryProperties) {
  let {instance, physicalDevice} = this;
  let buffer = new VkBuffer();
  let memory = new VkDeviceMemory();

  if (memoryProperties === void 0) memoryProperties = (
    VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT |
    VK_MEMORY_PROPERTY_HOST_COHERENT_BIT
  );

  let bufferInfo = new VkBufferCreateInfo();
  bufferInfo.size = byteLength;
  bufferInfo.usage = usage;
  bufferInfo.sharingMode = VK_SHARING_MODE_EXCLUSIVE;
  bufferInfo.queueFamilyIndexCount = 0;
  bufferInfo.pQueueFamilyIndices = null;
  result = vkCreateBuffer(instance, bufferInfo, null, buffer);
  ASSERT_VK_RESULT(result);

  let memoryRequirements = new VkMemoryRequirements();
  vkGetBufferMemoryRequirements(instance, buffer, memoryRequirements);

  let memAllocInfo = new VkMemoryAllocateInfo();
  memAllocInfo.allocationSize = memoryRequirements.size;
  memAllocInfo.memoryTypeIndex = physicalDevice.getMemoryTypeIndex(memoryRequirements.memoryTypeBits, memoryProperties);

  result = vkAllocateMemory(instance, memAllocInfo, null, memory);
  ASSERT_VK_RESULT(result);

  result = vkBindBufferMemory(instance, buffer, memory, 0n);
  ASSERT_VK_RESULT(result);

  return { buffer, memory };
};

LogicalDevice.prototype.createMappedBuffer = function(data, usage, memoryProperties) {
  let {instance} = this;

  let { buffer, memory } = this.allocateBuffer(data.byteLength, usage, memoryProperties);

  let dataPtr = { $: 0n };
  result = vkMapMemory(instance, memory, 0n, data.byteLength, 0, dataPtr);
  ASSERT_VK_RESULT(result);

  let arrayBuffer = ArrayBuffer.fromAddress(dataPtr.$, data.byteLength);
  new Uint8Array(arrayBuffer).set(new Uint8Array(data.buffer), 0x0);

  console.assert(arrayBuffer.byteLength === data.byteLength);

  //vkUnmapMemory(instance, memory);

  return { buffer, memory, view: new (data.constructor)(arrayBuffer), arrayBuffer };
};

LogicalDevice.prototype.allocateImage = function(format, extent, tiling, usage, memoryProperties) {
  let {instance, physicalDevice} = this;

  let image = new VkImage();
  let view = new VkImageView();
  let memory = new VkDeviceMemory();

  let imageInfo = new VkImageCreateInfo();
  imageInfo.sType = VK_STRUCTURE_TYPE_IMAGE_CREATE_INFO;
  imageInfo.imageType = VK_IMAGE_TYPE_2D;
  imageInfo.format = format;
  imageInfo.extent = extent;
  imageInfo.mipLevels = 1;
  imageInfo.arrayLayers = 1;
  imageInfo.samples = VK_SAMPLE_COUNT_1_BIT;
  imageInfo.tiling = tiling;
  imageInfo.usage = usage;
  imageInfo.sharingMode = VK_SHARING_MODE_EXCLUSIVE;
  imageInfo.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED;

  result = vkCreateImage(instance, imageInfo, null, image);
  ASSERT_VK_RESULT(result);

  let memoryRequirements = new VkMemoryRequirements();
  vkGetImageMemoryRequirements(instance, image, memoryRequirements);

  let memoryAllocateInfo = new VkMemoryAllocateInfo();
  memoryAllocateInfo.allocationSize = memoryRequirements.size;
  memoryAllocateInfo.memoryTypeIndex = physicalDevice.getMemoryTypeIndex(
    memoryRequirements.memoryTypeBits,
    memoryProperties
  );

  result = vkAllocateMemory(instance, memoryAllocateInfo, null, memory);
  ASSERT_VK_RESULT(result);

  result = vkBindImageMemory(instance, image, memory, 0x0);
  ASSERT_VK_RESULT(result);

  let imageViewInfo = new VkImageViewCreateInfo();
  imageViewInfo.image = image;
  imageViewInfo.viewType = VK_IMAGE_VIEW_TYPE_2D;
  imageViewInfo.format = format;
  imageViewInfo.subresourceRange.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
  imageViewInfo.subresourceRange.baseMipLevel = 0;
  imageViewInfo.subresourceRange.levelCount = 1;
  imageViewInfo.subresourceRange.baseArrayLayer = 0;
  imageViewInfo.subresourceRange.layerCount = 1;

  result = vkCreateImageView(instance, imageViewInfo, null, view);
  ASSERT_VK_RESULT(result);

  return { image, view, memory };
};

LogicalDevice.prototype.createShaderModule = function(shaderPath, stageBit) {
  let {instance} = this;

  let shaderSrc = readBinarySPIRVShader(shaderPath);

  let module = new VkShaderModule();
  let shaderModuleInfo = new VkShaderModuleCreateInfo();
  shaderModuleInfo.sType = VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO;
  shaderModuleInfo.pCode = shaderSrc;
  shaderModuleInfo.codeSize = shaderSrc.byteLength;
  result = vkCreateShaderModule(instance, shaderModuleInfo, null, module);
  ASSERT_VK_RESULT(result);

  let stage = new VkPipelineShaderStageCreateInfo();
  stage.stage = stageBit;
  stage.module = module;
  stage.pName = "main";
  stage.pSpecializationInfo = null;

  return {
    stage,
    module
  };
};

LogicalDevice.prototype.setImageMemoryBarrier = function({
  image,
  commandBuffer,
  srcAccessMask,
  dstAccessMask,
  oldLayout,
  newLayout
} = _) {
  let subresourceRange = new VkImageSubresourceRange();
  subresourceRange.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
  subresourceRange.baseMipLevel = 0;
  subresourceRange.levelCount = 1;
  subresourceRange.baseArrayLayer = 0;
  subresourceRange.layerCount = 1;

  let imageMemoryBarrier = new VkImageMemoryBarrier();
  imageMemoryBarrier.srcQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
  imageMemoryBarrier.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
  imageMemoryBarrier.subresourceRange = subresourceRange;
  imageMemoryBarrier.image = image;
  imageMemoryBarrier.srcAccessMask = srcAccessMask;
  imageMemoryBarrier.dstAccessMask = dstAccessMask;
  imageMemoryBarrier.oldLayout = oldLayout;
  imageMemoryBarrier.newLayout = newLayout;
  vkCmdPipelineBarrier(commandBuffer, VK_PIPELINE_STAGE_ALL_COMMANDS_BIT, VK_PIPELINE_STAGE_ALL_COMMANDS_BIT, 0, 0, null, 0, null, 1, [imageMemoryBarrier]);
};
