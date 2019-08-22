import { WARN, ASSERT_VK_RESULT } from "../utils.mjs";

import TextureArrayBuffer from "../TextureArrayBuffer.mjs";

/**
 * Creates the scene's textures (materials, skybox)
 */
export default class SceneTextureBuffer {
  constructor(opts = {}) {
    this.buffers = {
      skybox: null,
      material: null
    };
    this.logicalDevice = opts.logicalDevice;
    this.physicalDevice = opts.physicalDevice;
  }
};

SceneTextureBuffer.prototype.create = function(textures, skybox = null) {
  let {logicalDevice, physicalDevice} = this;

  let surfaceFormat = VK_FORMAT_R8G8B8A8_UNORM;

  // use black skybox if non was declared
  skybox = skybox || {
    width: 16,
    height: 16,
    data: new Uint8ClampedArray(16 * 16 * 4)
  };

  // create skybox buffer
  let skyboxTextureBuffer = new TextureArrayBuffer({ logicalDevice, physicalDevice });
  skyboxTextureBuffer.create([skybox], surfaceFormat);

  // create textures buffer
  let materialTextureBuffer = new TextureArrayBuffer({ logicalDevice, physicalDevice });
  materialTextureBuffer.create(textures, surfaceFormat);

  this.buffers.skybox = skyboxTextureBuffer;
  this.buffers.material = materialTextureBuffer;
};
