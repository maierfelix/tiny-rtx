import { ASSERT_VK_RESULT } from "./utils.mjs";

export default class CommandBuffer {
  constructor(opts) {
    if (!CommandBuffer.commandPool) {
      CommandBuffer.createCommandPool(opts.logicalDevice);
    }
    this.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT;
    this.isDestroyed = false;
    this.instance = new VkCommandBuffer();
    this.commandPool = CommandBuffer.commandPool;
    this.logicalDevice = opts.logicalDevice;
  }
};

CommandBuffer.prototype.create = function(level, flags) {
  let {instance, commandPool} = this;
  let {logicalDevice} = this;
  let device = logicalDevice.instance;

  let commandBufferAllocateInfo = new VkCommandBufferAllocateInfo();
  commandBufferAllocateInfo.commandPool = commandPool;
  commandBufferAllocateInfo.level = level;
  commandBufferAllocateInfo.commandBufferCount = 1;
  result = vkAllocateCommandBuffers(device, commandBufferAllocateInfo, [instance]);
  ASSERT_VK_RESULT(result);

  if (flags !== void 0) this.flags = flags;
  return this;
};

CommandBuffer.prototype.begin = function() {
  if (this.isDestroyed) throw new ReferenceError(`CommandBuffer is destroyed!`);
  let {instance} = this;
  let cmdBufferBeginInfo = new VkCommandBufferBeginInfo();
  cmdBufferBeginInfo.flags = this.flags;
  // begin recording
  result = vkBeginCommandBuffer(instance, cmdBufferBeginInfo);
  ASSERT_VK_RESULT(result);
};

CommandBuffer.prototype.end = function(destroy = false) {
  if (this.isDestroyed) throw new ReferenceError(`CommandBuffer is destroyed!`);
  let {instance, commandPool} = this;
  let {logicalDevice} = this;
  let device = logicalDevice.instance;
  let queue = logicalDevice.queues.graphics;
  // stop recording
  result = vkEndCommandBuffer(instance);
  ASSERT_VK_RESULT(result);

  let submitInfo = new VkSubmitInfo();
  submitInfo.commandBufferCount = 1;
  submitInfo.pCommandBuffers = [instance];

  // create waiting fence
  let fence = new VkFence();
  let fenceInfo = new VkFenceCreateInfo();
  result = vkCreateFence(device, fenceInfo, null, fence);
  ASSERT_VK_RESULT(result);
  // submit to queue
  result = vkQueueSubmit(queue, 1, [submitInfo], fence);
  ASSERT_VK_RESULT(result);
  //vkQueueWaitIdle(queue);
  // wait until cmdbuffer finished executing
  result = vkWaitForFences(device, 1, [fence], true, Number.MAX_SAFE_INTEGER);
  ASSERT_VK_RESULT(result);

  // destroy
  vkDestroyFence(device, fence, null);

  if (destroy) this.destroy();
};

CommandBuffer.prototype.destroy = function() {
  if (this.isDestroyed) throw new ReferenceError(`CommandBuffer is already destroyed!`);
  let {instance, commandPool} = this;
  let {logicalDevice} = this;
  let device = logicalDevice.instance;
  vkFreeCommandBuffers(device, commandPool, 1,[instance]);
  this.isDestroyed = true;
};

CommandBuffer.prototype.setImageBarrier = function(
  image,
  subresourceRange,
  srcAccessMask, dstAccessMask,
  oldLayout, newLayout
) {
  if (this.isDestroyed) throw new ReferenceError(`CommandBuffer is destroyed!`);
  let {instance} = this;

  let imageMemoryBarrier = new VkImageMemoryBarrier();
  imageMemoryBarrier.srcAccessMask = srcAccessMask;
  imageMemoryBarrier.dstAccessMask = dstAccessMask;
  imageMemoryBarrier.oldLayout = oldLayout;
  imageMemoryBarrier.newLayout = newLayout;
  imageMemoryBarrier.srcQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
  imageMemoryBarrier.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
  imageMemoryBarrier.image = image;
  imageMemoryBarrier.subresourceRange = subresourceRange;

  vkCmdPipelineBarrier(
    instance,
    VK_PIPELINE_STAGE_ALL_COMMANDS_BIT, VK_PIPELINE_STAGE_ALL_COMMANDS_BIT,
    0,
    0, null,
    0, null,
    1, [imageMemoryBarrier]
  );
};

CommandBuffer.prototype.setImageLayout = function(
  image,
  oldImageLayout,
  newImageLayout,
  subresourceRange,
  srcStageMask = VK_PIPELINE_STAGE_ALL_COMMANDS_BIT,
  dstStageMask = VK_PIPELINE_STAGE_ALL_COMMANDS_BIT
) {
  if (this.isDestroyed) throw new ReferenceError(`CommandBuffer is destroyed!`);
  let {instance} = this;
  let imageMemoryBarrier = new VkImageMemoryBarrier();
  imageMemoryBarrier.image = image;
  imageMemoryBarrier.oldLayout = oldImageLayout;
  imageMemoryBarrier.newLayout = newImageLayout;
  imageMemoryBarrier.subresourceRange = subresourceRange;
  imageMemoryBarrier.srcQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
  imageMemoryBarrier.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;

  switch (oldImageLayout) {
    case VK_IMAGE_LAYOUT_UNDEFINED:
      // Image layout is undefined (or does not matter)
      // Only valid as initial layout
      // No flags required, listed only for completeness
      imageMemoryBarrier.srcAccessMask = 0;
    break;
    case VK_IMAGE_LAYOUT_PREINITIALIZED:
      // Image is preinitialized
      // Only valid as initial layout for linear images, preserves memory contents
      // Make sure host writes have been finished
      imageMemoryBarrier.srcAccessMask = VK_ACCESS_HOST_WRITE_BIT;
    break;
    case VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL:
      // Image is a color attachment
      // Make sure any writes to the color buffer have been finished
      imageMemoryBarrier.srcAccessMask = VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT;
    break;
    case VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL:
      // Image is a depth/stencil attachment
      // Make sure any writes to the depth/stencil buffer have been finished
      imageMemoryBarrier.srcAccessMask = VK_ACCESS_DEPTH_STENCIL_ATTACHMENT_WRITE_BIT;
    break;
    case VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL:
      // Image is a transfer source 
      // Make sure any reads from the image have been finished
      imageMemoryBarrier.srcAccessMask = VK_ACCESS_TRANSFER_READ_BIT;
    break;
    case VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL:
      // Image is a transfer destination
      // Make sure any writes to the image have been finished
      imageMemoryBarrier.srcAccessMask = VK_ACCESS_TRANSFER_WRITE_BIT;
    break;
    case VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL:
      // Image is read by a shader
      // Make sure any shader reads from the image have been finished
      imageMemoryBarrier.srcAccessMask = VK_ACCESS_SHADER_READ_BIT;
    break;
    default:
      // Other source layouts aren't handled (yet)
    break;
  }
  // Target layouts (new)
  // Destination access mask controls the dependency for the new image layout
  switch (newImageLayout) {
    case VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL:
      // Image will be used as a transfer destination
      // Make sure any writes to the image have been finished
      imageMemoryBarrier.dstAccessMask = VK_ACCESS_TRANSFER_WRITE_BIT;
    break;
    case VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL:
      // Image will be used as a transfer source
      // Make sure any reads from the image have been finished
      imageMemoryBarrier.dstAccessMask = VK_ACCESS_TRANSFER_READ_BIT;
    break;
    case VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL:
      // Image will be used as a color attachment
      // Make sure any writes to the color buffer have been finished
      imageMemoryBarrier.dstAccessMask = VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT;
    break;
    case VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL:
      // Image layout will be used as a depth/stencil attachment
      // Make sure any writes to depth/stencil buffer have been finished
      imageMemoryBarrier.dstAccessMask = imageMemoryBarrier.dstAccessMask | VK_ACCESS_DEPTH_STENCIL_ATTACHMENT_WRITE_BIT;
    break;
    case VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL:
      // Image will be read in a shader (sampler, input attachment)
      // Make sure any writes to the image have been finished
      if (imageMemoryBarrier.srcAccessMask == 0) {
        imageMemoryBarrier.srcAccessMask = VK_ACCESS_HOST_WRITE_BIT | VK_ACCESS_TRANSFER_WRITE_BIT;
      }
      imageMemoryBarrier.dstAccessMask = VK_ACCESS_SHADER_READ_BIT;
    break;
    default:
      // Other source layouts aren't handled (yet)
    break;
  }
  // Put barrier inside setup command buffer
  vkCmdPipelineBarrier(
    instance,
    srcStageMask, dstStageMask,
    0,
    0, null,
    0, null,
    1, [imageMemoryBarrier]
  );
};

CommandBuffer.createCommandPool = function(logicalDevice) {
  let commandPool = new VkCommandPool();

  let {physicalDevice} = logicalDevice;
  let {graphicsFamilyIndex} = physicalDevice.queueFamilyIndices;

  let commandPoolInfo = new VkCommandPoolCreateInfo();
  commandPoolInfo.flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT;
  commandPoolInfo.queueFamilyIndex = graphicsFamilyIndex;

  result = vkCreateCommandPool(logicalDevice.instance, commandPoolInfo, null, commandPool);
  ASSERT_VK_RESULT(result);

  CommandBuffer.commandPool = commandPool;
};

// shared
CommandBuffer.commandPool = null;
