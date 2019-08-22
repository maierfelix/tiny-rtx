import { ASSERT_VK_RESULT } from "../utils.mjs";

import Buffer from "../Buffer.mjs";

/**
 * Stores all scene's geometry into flatten buffers
 */
export default class SceneGeometryBuffer {
  constructor(opts = {}) {
    this.buffers = {
      attributes: [],
      faces: [],
      materials: []
    };
    this.logicalDevice = opts.logicalDevice;
    this.physicalDevice = opts.physicalDevice;
  }
};

SceneGeometryBuffer.prototype.create = function(geometries, materials, textures) {
  let {logicalDevice, physicalDevice} = this;
  let {buffers} = this;

  // for each individual geometry we create a separate geometry buffer,
  // which gets later indexed in the shader using 'gl_InstanceCustomIndexNV'
  // this way we can use instancing for attributes such as normals etc.
  for (let ii = 0; ii < geometries.length; ++ii) {
    // create host visible geometry buffer
    let {attributeBuffer, faceBuffer} = this.createGeometryBuffer(geometries[ii]);

    // stage the buffers over to the device
    let stagedAttributeBuffer = new Buffer({ logicalDevice, physicalDevice });
    stagedAttributeBuffer.allocate(
      attributeBuffer.byteLength,
      // aka: staged SSBO for RT
      VK_BUFFER_USAGE_TRANSFER_DST_BIT |
      VK_BUFFER_USAGE_STORAGE_BUFFER_BIT |
      VK_BUFFER_USAGE_RAY_TRACING_BIT_NV,
      VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT
    );

    let stagedFaceBuffer = new Buffer({ logicalDevice, physicalDevice });
    stagedFaceBuffer.allocate(
      faceBuffer.byteLength,
      // aka: SSBO for RT
      VK_BUFFER_USAGE_TRANSFER_DST_BIT |
      VK_BUFFER_USAGE_STORAGE_BUFFER_BIT |
      VK_BUFFER_USAGE_RAY_TRACING_BIT_NV,
      VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT
    );
    // we no longer have to write to them

    attributeBuffer.copyToBuffer(stagedAttributeBuffer, 0x0, 0x0, attributeBuffer.byteLength);
    faceBuffer.copyToBuffer(stagedFaceBuffer, 0x0, 0x0, faceBuffer.byteLength);

    buffers.attributes.push(stagedAttributeBuffer);
    buffers.faces.push(stagedFaceBuffer);

    // and finally free the host visible buffers
    attributeBuffer.destroy();
    faceBuffer.destroy();
  };

  // just like we process the geometry buffers
  // for each individual material we create a storage buffer
  // which gets later indexed in the shader using 'gl_InstanceCustomIndexNV'
  for (let ii = 0; ii < materials.length; ++ii) {
    // create host visible geometry buffer
    let {materialBuffer} = this.createMaterialBuffer(materials[ii], textures);

    // stage the buffers over to the device
    let stagedMaterialBuffer = new Buffer({ logicalDevice, physicalDevice });
    stagedMaterialBuffer.allocate(
      materialBuffer.byteLength,
      // aka: staged SSBO for RT
      VK_BUFFER_USAGE_TRANSFER_DST_BIT |
      VK_BUFFER_USAGE_STORAGE_BUFFER_BIT |
      VK_BUFFER_USAGE_RAY_TRACING_BIT_NV,
      VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT
    );

    materialBuffer.copyToBuffer(stagedMaterialBuffer, 0x0, 0x0, materialBuffer.byteLength);

    buffers.materials.push(stagedMaterialBuffer);

    // and finally free the host visible buffers
    materialBuffer.destroy();
  };

};

SceneGeometryBuffer.prototype.createGeometryBuffer = function(geometry) {
  let {logicalDevice, physicalDevice} = this;
  let {uvs, normals, tangents, indices} = geometry.mesh;

  // allocate
  let attributeBuffer = new Buffer({ logicalDevice, physicalDevice });
  attributeBuffer.allocate(
    new Float32Array(indices.length * 12),
    VK_BUFFER_USAGE_TRANSFER_SRC_BIT,
    VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT
  );
  let faceBuffer = new Buffer({ logicalDevice, physicalDevice });
  faceBuffer.allocate(
    new Uint32Array(indices.length / 3 * 4),
    VK_BUFFER_USAGE_TRANSFER_SRC_BIT,
    VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT
  );

  // write attributes directly into the mapped buffer
  let attributes = new Float32Array(attributeBuffer.mapped);
  for (let ii = 0; ii < indices.length; ++ii) {
    let index = indices[ii];
    let offset = ii * 12;
    attributes[offset++] = normals[index * 3 + 0];
    attributes[offset++] = normals[index * 3 + 1];
    attributes[offset++] = normals[index * 3 + 2];
    attributes[offset++] = 0;
    attributes[offset++] = tangents[index * 3 + 0];
    attributes[offset++] = tangents[index * 3 + 1];
    attributes[offset++] = tangents[index * 3 + 2];
    attributes[offset++] = 0;
    attributes[offset++] = uvs[index * 2 + 0];
    attributes[offset++] = 1.0 - uvs[index * 2 + 1];
    //attributes[offset++] = 0;
    //attributes[offset++] = 0;
    // skip these, but it's still 12*4 bytes
  };

  // write faces directly into the mapped buffer
  let faces = new Uint32Array(faceBuffer.mapped);
  for (let ii = 0; ii < indices.length / 3; ++ii) {
    let index = ii * 3;
    let offset = ii * 4;
    faces[offset++] = index + 0;
    faces[offset++] = index + 1;
    faces[offset++] = index + 2;
  };

  attributeBuffer.unmap();
  faceBuffer.unmap();

  return { attributeBuffer, faceBuffer };
};

SceneGeometryBuffer.prototype.createMaterialBuffer = function(material, textures) {
  let {logicalDevice, physicalDevice} = this;

  // allocate
  let materialBuffer = new Buffer({ logicalDevice, physicalDevice });
  materialBuffer.allocate(
    new Uint8Array(8 * 4),
    VK_BUFFER_USAGE_TRANSFER_SRC_BIT,
    VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT
  );

  // first texture is empty (used when a material has no texture assigned)
  let textureIndex = -1;
  if (material.texture !== void 0) {
    textureIndex = textures.indexOf(material.texture) + 1;
    if (textureIndex <= -1) {
      throw new ReferenceError(`Material Texture is invalid or was never created`);
    }
  } else {
    textureIndex = 0;
  }

  // write material
  let uint32View = new Uint32Array(materialBuffer.mapped);
  let float32View = new Float32Array(materialBuffer.mapped);
  // color
  float32View[0] = material.color[0];
  float32View[1] = material.color[1];
  float32View[2] = material.color[2];
  // material model
  uint32View[3] = material.materialModel;
  // IOR
  float32View[4] = material.IOR;
  // textureIndex
  uint32View[5] = textureIndex;

  materialBuffer.unmap();

  return { materialBuffer };
};
