import { ASSERT_VK_RESULT } from "../utils.mjs";

import ImageBuffer from "../ImageBuffer.mjs";

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

};
