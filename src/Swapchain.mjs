import { ASSERT_VK_RESULT } from "./utils.mjs";

import CommandBuffer from "./CommandBuffer.mjs";

export default class Swapchain {
  constructor(opts) {
    this.instance = new VkSwapchainKHR();
    this.window = opts.window;
    this.surface = opts.surface;
    this.logicalDevice = opts.logicalDevice;
    this.physicalDevice = opts.physicalDevice;
    this.images = [];
    this.imageViews = [];
    this.frameBuffers = [];
    this.drawCommandBuffers = [];
    this.synchronization = {
      frameReadyFences: [],
      imageAvailable: new VkSemaphore(),
      renderingAvailable: new VkSemaphore()
    };
  }
  get imageCount() {
    return this.images.length;
  }
};

Swapchain.prototype.create = function() {
  let {instance, window, surface, logicalDevice, physicalDevice} = this;
  let {synchronization} = this;

  let surfaceCapabilities = surface.getCapabilities();

  let presentModes = this.getPresentModes();

  let isMailboxSupported = presentModes.includes(VK_PRESENT_MODE_MAILBOX_KHR);

  let presentMode = isMailboxSupported ? VK_PRESENT_MODE_MAILBOX_KHR : VK_PRESENT_MODE_FIFO_KHR;

  let {surfaceFormat} = surface;

  let {width, height} = window;

  let swapchainKHRInfo = new VkSwapchainCreateInfoKHR();
  swapchainKHRInfo.surface = surface.instance;
  swapchainKHRInfo.minImageCount = surfaceCapabilities.minImageCount;
  swapchainKHRInfo.imageFormat = surfaceFormat.format;
  swapchainKHRInfo.imageColorSpace = surfaceFormat.colorSpace;
  swapchainKHRInfo.imageExtent.width = width;
  swapchainKHRInfo.imageExtent.height = height;
  swapchainKHRInfo.imageArrayLayers = 1;
  swapchainKHRInfo.imageUsage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT | VK_IMAGE_USAGE_TRANSFER_DST_BIT;
  swapchainKHRInfo.imageSharingMode = VK_SHARING_MODE_EXCLUSIVE;
  swapchainKHRInfo.queueFamilyIndexCount = 0;
  swapchainKHRInfo.pQueueFamilyIndices = null;
  swapchainKHRInfo.preTransform = VK_SURFACE_TRANSFORM_IDENTITY_BIT_KHR;
  swapchainKHRInfo.compositeAlpha = VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR;
  swapchainKHRInfo.presentMode = presentMode;
  swapchainKHRInfo.clipped = true;
  swapchainKHRInfo.oldSwapchain = null;

  result = vkCreateSwapchainKHR(logicalDevice.instance, swapchainKHRInfo, null, instance);
  ASSERT_VK_RESULT(result);

  this.images = this.createImages();
  this.imageViews = this.createImageViews();
  let frameReadyFences = this.createFrameReadyFences();
  let {imageAvailable, renderingAvailable} = this.createImageSynchronization();
  synchronization.frameReadyFences = frameReadyFences;
  synchronization.imageAvailable = imageAvailable;
  synchronization.renderingAvailable = renderingAvailable;
  this.createDrawCommandBuffers();
};

Swapchain.prototype.destroy = function() {
  
};

Swapchain.prototype.getPresentModes = function() {
  let {physicalDevice, surface} = this;
  let presentModeCount = { $: 0 };
  vkGetPhysicalDeviceSurfacePresentModesKHR(physicalDevice.instance, surface.instance, presentModeCount, null);
  let presentModes = new Int32Array(presentModeCount.$);
  vkGetPhysicalDeviceSurfacePresentModesKHR(physicalDevice.instance, surface.instance, presentModeCount, presentModes);
  return presentModes;
};

Swapchain.prototype.createImages = function() {
  let {instance, logicalDevice} = this;

  let imageCount = { $: 0 };
  vkGetSwapchainImagesKHR(logicalDevice.instance, instance, imageCount, null);
  let swapchainImages = [...Array(imageCount.$)].map(() => new VkImage());
  vkGetSwapchainImagesKHR(logicalDevice.instance, instance, imageCount, swapchainImages);

  return swapchainImages;
};

Swapchain.prototype.createImageViews = function() {
  let {surface, logicalDevice} = this;
  let {images, imageCount} = this;

  let {surfaceFormat} = surface;

  let imageViews = [...Array(imageCount)].map(() => new VkImageView());
  for (let ii = 0; ii < imageCount; ++ii) {
    let imageViewInfo = new VkImageViewCreateInfo();
    imageViewInfo.image = images[ii];
    imageViewInfo.viewType = VK_IMAGE_VIEW_TYPE_2D;
    imageViewInfo.format = surfaceFormat.format;
    imageViewInfo.subresourceRange.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
    imageViewInfo.subresourceRange.baseMipLevel = 0;
    imageViewInfo.subresourceRange.levelCount = 1;
    imageViewInfo.subresourceRange.baseArrayLayer = 0;
    imageViewInfo.subresourceRange.layerCount = 1;

    result = vkCreateImageView(logicalDevice.instance, imageViewInfo, null, imageViews[ii]);
    ASSERT_VK_RESULT(result);
  };

  return imageViews;
};

Swapchain.prototype.createFrameBuffers = function(renderPass) {
  let {window, logicalDevice} = this;
  let {imageViews, imageCount} = this;
  let framebuffers = [...Array(imageCount)].map(() => new VkFramebuffer());
  for (let ii = 0; ii < imageCount; ++ii) {
    let framebufferInfo = new VkFramebufferCreateInfo();
    framebufferInfo.renderPass = renderPass.instance;
    framebufferInfo.attachmentCount = 1;
    framebufferInfo.pAttachments = [imageViews[ii]];
    framebufferInfo.width = window.width;
    framebufferInfo.height = window.height;
    framebufferInfo.layers = 1;
    result = vkCreateFramebuffer(logicalDevice.instance, framebufferInfo, null, framebuffers[ii]);
    ASSERT_VK_RESULT(result);
  };
  this.frameBuffers = framebuffers;
  return framebuffers;
};

Swapchain.prototype.createFrameReadyFences = function() {
  let {logicalDevice} = this;
  let {imageCount} = this;

  let fenceInfo = new VkFenceCreateInfo();
  fenceInfo.flags = VK_FENCE_CREATE_SIGNALED_BIT;

  let frameReadyFences = [...Array(imageCount)].map(() => new VkFence());
  frameReadyFences.map(fence => {
    vkCreateFence(logicalDevice.instance, fenceInfo, null, fence);
  });

  return frameReadyFences;
};

Swapchain.prototype.createImageSynchronization = function() {
  let {logicalDevice} = this;
  let {imageAvailable, renderingAvailable} = this.synchronization;
  let semaphoreInfo = new VkSemaphoreCreateInfo();

  result = vkCreateSemaphore(logicalDevice.instance, semaphoreInfo, null, imageAvailable);
  ASSERT_VK_RESULT(result);

  result = vkCreateSemaphore(logicalDevice.instance, semaphoreInfo, null, renderingAvailable);
  ASSERT_VK_RESULT(result);

  return {imageAvailable, renderingAvailable};
};

Swapchain.prototype.createDrawCommandBuffers = function() {
  let {logicalDevice} = this;
  let {imageCount, drawCommandBuffers} = this;
  for (let ii = 0; ii < imageCount; ++ii) {
    let commandBuffer = new CommandBuffer({ logicalDevice });
    commandBuffer.create(VK_COMMAND_BUFFER_LEVEL_PRIMARY, VK_COMMAND_BUFFER_USAGE_SIMULTANEOUS_USE_BIT);
    drawCommandBuffers.push(commandBuffer);
  };
};
