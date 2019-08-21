import { ASSERT_VK_RESULT } from "../utils.mjs";

import Buffer from "../Buffer.mjs";

class GeometryInstance {
  constructor(geometry, data) {
    let {transform, material} = data;
    if (!(transform instanceof Float32Array)) {
      throw new TypeError(`Invalid or unsupported type for Transform data. Expected type 'Float32Array'`);
    }
    if (transform.length !== 12) {
      throw new SyntaxError(`Invalid transform length. Transform data must be a 3x4 Matrix`);
    }
    this.geometry = geometry;
    this.transform = transform;
    this.material = material;
  }
};

export default class AccelerationGeometry {
  constructor(opts = {}) {
    this.mesh = null;
    this.geometry = null;
    this.buffers = {
      vertex: null,
      index: null
    };
    this.instances = [];
    this.logicalDevice = opts.logicalDevice;
    this.physicalDevice = opts.physicalDevice;
  }
};

AccelerationGeometry.prototype.create = function(mesh) {
  let {vertices, indices} = mesh;

  let buffers = this.allocate(mesh);

  let vertexStride = 3;
  let vertexFormat = VK_FORMAT_R32G32B32_SFLOAT;
  let indexType = indices.constructor === Uint32Array ? VK_INDEX_TYPE_UINT32 : VK_INDEX_TYPE_UINT16;

  let geometry = new VkGeometryNV();
  geometry.geometry = new VkGeometryDataNV();
  geometry.geometry.aabbs = new VkGeometryAABBNV();
  geometry.geometryType = VK_GEOMETRY_TYPE_TRIANGLES_NV;
  geometry.geometry.triangles.vertexData = buffers.vertex.instance;
  geometry.geometry.triangles.vertexOffset = 0;
  geometry.geometry.triangles.vertexCount = vertices.length;
  geometry.geometry.triangles.vertexStride = vertexStride * vertices.constructor.BYTES_PER_ELEMENT;
  geometry.geometry.triangles.vertexFormat = VK_FORMAT_R32G32B32_SFLOAT;
  geometry.geometry.triangles.indexData = buffers.index.instance;
  geometry.geometry.triangles.indexOffset = 0;
  geometry.geometry.triangles.indexCount = indices.length;
  geometry.geometry.triangles.indexType = VK_INDEX_TYPE_UINT32;
  geometry.geometry.triangles.transformData = null;
  geometry.geometry.triangles.transformOffset = 0;
  geometry.flags = VK_GEOMETRY_OPAQUE_BIT_NV;

  this.mesh = mesh;
  this.geometry = geometry;

  return this;
};

AccelerationGeometry.prototype.destroy = function() {
  let {buffers} = this;
  this.mesh = null;
  this.geometry = null;
  if (buffers.vertex) buffers.vertex.destroy();
  if (buffers.index) buffers.index.destroy();
};

AccelerationGeometry.prototype.allocate = function(mesh) {
  let {logicalDevice, physicalDevice} = this;
  let {buffers} = this;
  let {vertices, indices} = mesh;
  // allocate vertices
  let vertexBuffer = new Buffer({ logicalDevice, physicalDevice });
  vertexBuffer.allocate(
    vertices,
    VK_BUFFER_USAGE_VERTEX_BUFFER_BIT,
    VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT
  );
  vertexBuffer.unmap();
  // allocate indices
  let indexBuffer = new Buffer({ logicalDevice, physicalDevice });
  indexBuffer.allocate(
    indices,
    VK_BUFFER_USAGE_INDEX_BUFFER_BIT,
    VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT
  );
  indexBuffer.unmap();
  buffers.vertex = vertexBuffer;
  buffers.index = indexBuffer;
  return buffers;
};

AccelerationGeometry.prototype.addInstance = function(data) {
  // validate input
  if (!data.hasOwnProperty("transform")) {
    throw new ReferenceError(`Geometry Instance is missing a 'transform' property`);
  }
  if (!data.hasOwnProperty("material")) {
    throw new ReferenceError(`Geometry Instance is missing a 'material' property`);
  }
  // validate input types
  if (!(data.transform instanceof Float32Array)) {
    throw new TypeError(`Geometry Instance requires 'transform' property to be of type 'Float32Array'`);
  }
  if (data.transform.length !== (3 * 4)) {
    throw new TypeError(`Geometry Instance requires 'transform' property to be a 3x4 Matrix`);
  }
  let instance = new AccelerationGeometry.GeometryInstance(this, data);
  this.instances.push(instance);
};

AccelerationGeometry.GeometryInstance = GeometryInstance;
