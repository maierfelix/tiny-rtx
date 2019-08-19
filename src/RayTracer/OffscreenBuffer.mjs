import { ASSERT_VK_RESULT } from "../utils.mjs";

import ImageBuffer from "../ImageBuffer.mjs";

export default class OffscreenBuffer extends ImageBuffer {
  constructor(opts = {}) {
    super(opts);
  }
};

OffscreenBuffer.prototype.create = function(width, height, depth, surfaceFormat) {
  let extent = new VkExtent3D();
  extent.width = width;
  extent.height = height;
  extent.depth = depth;

  this.createImage(
    VK_IMAGE_TYPE_2D,
    surfaceFormat,
    extent,
    VK_IMAGE_TILING_OPTIMAL,
    VK_IMAGE_USAGE_STORAGE_BIT | VK_IMAGE_USAGE_TRANSFER_SRC_BIT,
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
