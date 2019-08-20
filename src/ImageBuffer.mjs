import { ASSERT_VK_RESULT } from "./utils.mjs";

export default class ImageBuffer {
  constructor(opts = {}) {
    this.image = new VkImage();
    this.imageView = new VkImageView();
    this.sampler = new VkSampler();
    this.memory = new VkDeviceMemory();
    this.logicalDevice = opts.logicalDevice;
    this.physicalDevice = opts.physicalDevice;
  }
};

ImageBuffer.prototype.create = function() {

};

ImageBuffer.prototype.destroy = function() {
  let {logicalDevice} = this;
  let {image, imageView, memory, sampler} = this;
  let device = logicalDevice.instance;
  if (imageView) {
    vkDestroyImageView(device, imageView, null);
  }
  if (memory) {
    vkFreeMemory(device, memory, null);
  }
  if (image) {
    vkDestroyImage(device, image, null);
  }
  if (sampler) {
    vkDestroySampler(device, sampler, null);
  }
};

ImageBuffer.prototype.createImage = function(imageType, format, extent, tiling, usage, memoryProperties) {
  let {logicalDevice, physicalDevice} = this;
  let {memory, image, imageView} = this;
  let device = logicalDevice.instance;

  let imageCreateInfo = new VkImageCreateInfo();
  imageCreateInfo.imageType = imageType;
  imageCreateInfo.format = format;
  imageCreateInfo.extent = extent;
  imageCreateInfo.mipLevels = 1;
  imageCreateInfo.arrayLayers = 1;
  imageCreateInfo.samples = VK_SAMPLE_COUNT_1_BIT;
  imageCreateInfo.tiling = tiling;
  imageCreateInfo.usage = usage;
  imageCreateInfo.sharingMode = VK_SHARING_MODE_EXCLUSIVE;
  imageCreateInfo.queueFamilyIndexCount = 0;
  imageCreateInfo.pQueueFamilyIndices = null;
  imageCreateInfo.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED;

  result = vkCreateImage(device, imageCreateInfo, null, image);
  ASSERT_VK_RESULT(result);

  let memoryRequirements = new VkMemoryRequirements();
  vkGetImageMemoryRequirements(device, image, memoryRequirements);

  let memoryAllocateInfo = new VkMemoryAllocateInfo();
  memoryAllocateInfo.allocationSize = memoryRequirements.size;
  memoryAllocateInfo.memoryTypeIndex = physicalDevice.getMemoryTypeIndex(memoryRequirements.memoryTypeBits, memoryProperties);

  result = vkAllocateMemory(device, memoryAllocateInfo, null, memory);
  ASSERT_VK_RESULT(result);

  result = vkBindImageMemory(device, image, memory, 0);
  ASSERT_VK_RESULT(result);
};

ImageBuffer.prototype.createImageView = function(viewType, format, subresourceRange) {
  let {logicalDevice} = this;
  let {image, imageView} = this;

  let imageViewCreateInfo = new VkImageViewCreateInfo();
  imageViewCreateInfo.viewType = viewType;
  imageViewCreateInfo.format = format;
  imageViewCreateInfo.subresourceRange = subresourceRange;
  imageViewCreateInfo.image = image;
  imageViewCreateInfo.flags = 0;
  imageViewCreateInfo.components.r = VK_COMPONENT_SWIZZLE_R;
  imageViewCreateInfo.components.g = VK_COMPONENT_SWIZZLE_G;
  imageViewCreateInfo.components.b = VK_COMPONENT_SWIZZLE_B;
  imageViewCreateInfo.components.a = VK_COMPONENT_SWIZZLE_A;

  result = vkCreateImageView(logicalDevice.instance, imageViewCreateInfo, null, imageView);
  ASSERT_VK_RESULT(result);
};

ImageBuffer.prototype.createSampler = function(magFilter, minFilter, mipmapMode, addressMode) {
  let {logicalDevice} = this;
  let {sampler} = this;

  let samplerCreateInfo = new VkSamplerCreateInfo();
  samplerCreateInfo.magFilter = magFilter;
  samplerCreateInfo.minFilter = minFilter;
  samplerCreateInfo.mipmapMode = mipmapMode;
  samplerCreateInfo.addressModeU = addressMode;
  samplerCreateInfo.addressModeV = addressMode;
  samplerCreateInfo.addressModeW = addressMode;
  samplerCreateInfo.mipLodBias = 0;
  samplerCreateInfo.anisotropyEnable = VK_FALSE;
  samplerCreateInfo.maxAnisotropy = 1;
  samplerCreateInfo.compareEnable = VK_FALSE;
  samplerCreateInfo.compareOp = VK_COMPARE_OP_ALWAYS;
  samplerCreateInfo.minLod = 0;
  samplerCreateInfo.maxLod = 0;
  samplerCreateInfo.borderColor = VK_BORDER_COLOR_INT_OPAQUE_BLACK;
  samplerCreateInfo.unnormalizedCoordinates = VK_FALSE;

  result = vkCreateSampler(logicalDevice.instance, samplerCreateInfo, null, sampler);
  ASSERT_VK_RESULT(result);
};

ImageBuffer.prototype.fromImageData = function(data) {

};
