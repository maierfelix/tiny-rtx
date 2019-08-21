import { ASSERT_VK_RESULT } from "../utils.mjs";

import ImageBuffer from "../ImageBuffer.mjs";

export default class AccumulationBuffer extends ImageBuffer {
  constructor(opts = {}) {
    super(opts);
  }
};

AccumulationBuffer.prototype.create = function(width, height) {
  let extent = new VkExtent3D();
  extent.width = width;
  extent.height = height;
  extent.depth = 1;

  let surfaceFormat = VK_FORMAT_R32G32B32A32_SFLOAT;

  this.allocate(
    VK_IMAGE_TYPE_2D,
    VK_FORMAT_R32G32B32A32_SFLOAT,
    extent,
    VK_IMAGE_TILING_OPTIMAL,
    VK_IMAGE_USAGE_STORAGE_BIT,
    VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT
  );

  let imageSubresourceRange = new VkImageSubresourceRange();
  imageSubresourceRange.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
  imageSubresourceRange.baseMipLevel = 0;
  imageSubresourceRange.levelCount = 1;
  imageSubresourceRange.baseArrayLayer = 0;
  imageSubresourceRange.layerCount = 1;

  this.createImageView(
    VK_IMAGE_VIEW_TYPE_2D,
    surfaceFormat,
    imageSubresourceRange
  );
};
