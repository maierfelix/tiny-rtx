import { ASSERT_VK_RESULT } from "../utils.mjs";

import Buffer from "../Buffer.mjs";
import ImageBuffer from "../ImageBuffer.mjs";
import CommandBuffer from "../CommandBuffer.mjs";

/**
 * Stores all scene's textures into flatten buffers
 */
export default class SceneTextureBuffer {
  constructor(opts = {}) {
    this.instances = [];
    this.logicalDevice = opts.logicalDevice;
    this.physicalDevice = opts.physicalDevice;
  }
};

SceneTextureBuffer.prototype.create = function(textures) {
  let {logicalDevice, physicalDevice} = this;

  // create initial image buffers
  let buffers = [];
  for (let ii = 0; ii < textures.length; ++ii) {
    let texture = textures[ii];
    let {data, width, height} = texture;

    // source buffer
    let pixelBuffer = new Buffer({ logicalDevice, physicalDevice });
    pixelBuffer.allocate(
      new Uint8Array(data.byteLength),
      VK_BUFFER_USAGE_TRANSFER_SRC_BIT,
      VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT
    );

    // write image data into the mapped buffer
    new Uint8ClampedArray(pixelBuffer.mapped, 0x0).set(data);

    // create staged image buffer
    let surfaceFormat = VK_FORMAT_R8G8B8A8_UNORM;
    let imageBuffer = new ImageBuffer({ logicalDevice, physicalDevice });

    imageBuffer.createImage(
      VK_IMAGE_TYPE_2D,
      surfaceFormat,
      new VkExtent3D({ width, height, depth: 1 }),
      VK_IMAGE_TILING_OPTIMAL,
      VK_IMAGE_USAGE_STORAGE_BIT | VK_IMAGE_USAGE_TRANSFER_SRC_BIT,
      VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT
    );

    buffers.push({ source: pixelBuffer, destination: imageBuffer });
  };

  // transition buffer layouts
  let commandBuffer = new CommandBuffer({ logicalDevice });
  commandBuffer.create(VK_COMMAND_BUFFER_LEVEL_PRIMARY);
  commandBuffer.begin();

  for (let ii = 0; ii < buffers.length; ++ii) {
    let {source, destination} = buffers[ii];
    commandBuffer.setImageLayout(

    );
  };
  commandBuffer.end(true);

};
