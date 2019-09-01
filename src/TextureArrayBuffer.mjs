import { WARN, ASSERT_VK_RESULT } from "./utils.mjs";

import Buffer from "./Buffer.mjs";
import ImageBuffer from "./ImageBuffer.mjs";
import CommandBuffer from "./CommandBuffer.mjs";

/**
 * Creates an array of textures
 * All textures must have the same dimension
 */
export default class TextureArrayBuffer {
  constructor(opts = {}) {
    this.instance = null;
    this.textures = [];
    this.logicalDevice = opts.logicalDevice;
    this.physicalDevice = opts.physicalDevice;
  }
};

TextureArrayBuffer.prototype.create = function(input, surfaceFormat) {
  let {logicalDevice, physicalDevice} = this;

  // make copy
  let textures = [...input];

  let {width, height} = textures.length ? textures[0] : { width: 16, height: 16 };

  const TEXTURE_BYTE_STRIDE = width * height * 4;

  // index 0 (reserved)
  // push empty texture at begin
  // this texture is used as a fake no-op, e.g. when no texture is used but a material color
  textures.unshift({
    data: new Uint8ClampedArray(TEXTURE_BYTE_STRIDE),
    width,
    height
  });

  // validate dimensions of input textures
  for (let ii = 0; ii < textures.length; ++ii) {
    let texture = textures[ii];
    if (texture.width !== width) {
      WARN(`Invalid Texture Width: Expected '${width}' but got '${texture.width}'`);
    }
    if (texture.height !== height) {
      WARN(`Invalid Texture Height: Expected '${height}' but got '${texture.height}'`);
    }
  };

  // source buffer
  let pixelBuffer = new Buffer({ logicalDevice, physicalDevice });
  // destination buffer
  let imageBuffer = new ImageBuffer({ logicalDevice, physicalDevice });

  // allocate
  pixelBuffer.allocate(
    new Uint8Array(textures.length * TEXTURE_BYTE_STRIDE), // total byte length
    VK_BUFFER_USAGE_TRANSFER_SRC_BIT,
    VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT
  );
  imageBuffer.allocate(
    VK_IMAGE_TYPE_2D,
    surfaceFormat,
    new VkExtent3D({ width, height, depth: 1 }),
    VK_IMAGE_TILING_OPTIMAL,
    VK_IMAGE_USAGE_SAMPLED_BIT | VK_IMAGE_USAGE_TRANSFER_DST_BIT,
    VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT,
    textures.length
  );

  // write the pixel data into source buffer
  let offset = 0x0;
  for (let ii = 0; ii < textures.length; ++ii) {
    let texture = textures[ii];
    // save the texture's offset
    // e.g. so we can update it efficiently later
    texture.offset = offset;
    new Uint8ClampedArray(pixelBuffer.mapped).set(texture.data, offset); // memcpy
    offset += TEXTURE_BYTE_STRIDE;
  };
  // we no longer have to write to it
  pixelBuffer.unmap();

  // generate copy regions
  let copyRegions = [];
  for (let ii = 0; ii < textures.length; ++ii) {
    let {offset} = textures[ii];
    let copyRegion = new VkBufferImageCopy();
    copyRegion.imageSubresource.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
    copyRegion.imageSubresource.mipLevel = 0;
    copyRegion.imageSubresource.baseArrayLayer = ii; // texture's array index
    copyRegion.imageSubresource.layerCount = 1;
    copyRegion.imageExtent.width = width;
    copyRegion.imageExtent.height = height;
    copyRegion.imageExtent.depth = 1;
    copyRegion.bufferOffset = offset;
    copyRegions.push(copyRegion);
  };

  let subresourceRange = new VkImageSubresourceRange();
  subresourceRange.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
  subresourceRange.baseMipLevel = 0;
  subresourceRange.levelCount = 1;
  subresourceRange.layerCount = textures.length;

  let commandBuffer = new CommandBuffer({ logicalDevice });
  commandBuffer.create(VK_COMMAND_BUFFER_LEVEL_PRIMARY);
  commandBuffer.begin();

  // transition image buffer into write state
  commandBuffer.setImageLayout(
    imageBuffer.image,
    VK_IMAGE_LAYOUT_UNDEFINED,
    VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL,
    subresourceRange
  );

  // copy buffer over to image buffer
  vkCmdCopyBufferToImage(
    commandBuffer.instance,
    pixelBuffer.instance,
    imageBuffer.image,
    VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL,
    copyRegions.length,
    copyRegions
  );

  // transition image buffer back into read state
  commandBuffer.setImageLayout(
    imageBuffer.image,
    VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL,
    VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL,
    subresourceRange
  );

  // flush & destroy cmd buffer
  commandBuffer.end(true);

  // destroy, since our data is now stored in the image buffer
  pixelBuffer.destroy();

  // create sampler
  let samplerInfo = new VkSamplerCreateInfo();
  samplerInfo.magFilter = VK_FILTER_LINEAR;
  samplerInfo.minFilter = VK_FILTER_LINEAR;
  samplerInfo.mipmapMode = VK_SAMPLER_MIPMAP_MODE_LINEAR;
  samplerInfo.addressModeU = VK_SAMPLER_ADDRESS_MODE_REPEAT;
  samplerInfo.addressModeV = VK_SAMPLER_ADDRESS_MODE_REPEAT;
  samplerInfo.addressModeW = VK_SAMPLER_ADDRESS_MODE_REPEAT;
  samplerInfo.mipLodBias = 0.0;
  samplerInfo.maxAnisotropy = 8.0;
  samplerInfo.compareOp = VK_COMPARE_OP_NEVER;
  samplerInfo.minLod = 0.0;
  samplerInfo.maxLod = 0.0;
  samplerInfo.borderColor = VK_BORDER_COLOR_FLOAT_OPAQUE_WHITE;

  result = vkCreateSampler(logicalDevice.instance, samplerInfo, null, imageBuffer.sampler);
  ASSERT_VK_RESULT(result);

  // create image view
  let imageViewInfo = new VkImageViewCreateInfo();
  imageViewInfo.image = imageBuffer.image;
  imageViewInfo.viewType = VK_IMAGE_VIEW_TYPE_2D_ARRAY;
  imageViewInfo.format = surfaceFormat;
  imageViewInfo.components.r = VK_COMPONENT_SWIZZLE_R;
  imageViewInfo.components.g = VK_COMPONENT_SWIZZLE_G;
  imageViewInfo.components.b = VK_COMPONENT_SWIZZLE_B;
  imageViewInfo.components.a = VK_COMPONENT_SWIZZLE_A;
  imageViewInfo.subresourceRange.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT;
  imageViewInfo.subresourceRange.baseMipLevel = 0;
  imageViewInfo.subresourceRange.levelCount = 1;
  imageViewInfo.subresourceRange.baseArrayLayer = 0;
  imageViewInfo.subresourceRange.layerCount = textures.length;

  result = vkCreateImageView(logicalDevice.instance, imageViewInfo, null, imageBuffer.imageView);
  ASSERT_VK_RESULT(result);

  this.instance = imageBuffer;
  this.textures = textures;
};
