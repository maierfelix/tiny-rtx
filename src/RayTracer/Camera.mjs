import { ASSERT_VK_RESULT } from "../utils.mjs";

import Buffer from "../Buffer.mjs";

import CameraLayout from "./layouts/CameraLayout.mjs";

const NEAR = 0.01;
const FAR = 8192.0;
const FOV = (45.0 * Math.PI) / 180;
const APERTURE = 0.0275;
const FOCUS_DISTANCE = 16.0;
const SMOOTH_MOVEMENT = 0.65;

const BOUNCE_COUNT = 12;
const SAMPLE_COUNT = 8;

const EPSILON = 0.001; // wow, harsh

export default class Camera {
  constructor(opts = {}) {
    this.layout = null;
    this.buffer = null;
    this.viewMatrix = mat4.create();
    this.modelMatrix = mat4.create();
    this.projectionMatrix = mat4.create();
    this.window = opts.window;
    this.bounceCount = BOUNCE_COUNT;
    this.sampleCount = SAMPLE_COUNT;
    this.rotation = {
      x: 25.0,
      y: 45.0,
      vx: 0.0,
      vy: 0.0
    };
    this.distance = {
      z: -12.0,
      vz: 0.0
    };
    this.totalSampleCount = 0;
    this.logicalDevice = opts.logicalDevice;
    this.physicalDevice = opts.physicalDevice;
  }
};

Camera.prototype.create = function() {
  let {window} = this;

  let mView = this.viewMatrix;
  let mModel = this.modelMatrix;
  let mProjection = this.projectionMatrix;
  let aspect = window.width / window.height;

  mat4.perspective(mProjection, FOV, aspect, NEAR, FAR);
  mProjection[5] *= -1.0; // vulkan's y axis is flipped
  mat4.invert(mProjection, mProjection);

  this.allocate();
  this.update();
};

Camera.prototype.destroy = function() {
  this.layout = null;
  if (this.buffer) {
    this.buffer.destroy();
    this.buffer = null;
  }
};

Camera.prototype.allocate = function() {
  let {logicalDevice, physicalDevice} = this;

  let buffer = new Buffer({ logicalDevice, physicalDevice });
  buffer.allocate(
    new Uint8Array(CameraLayout.byteLength),
    VK_BUFFER_USAGE_UNIFORM_BUFFER_BIT | VK_BUFFER_USAGE_RAY_TRACING_BIT_NV,
    VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT
  );
  // notice that we use the just allocated buffer as the layout's input buffer,
  // so all data layout updates are directly synced with the mapped buffer
  this.layout = new CameraLayout(buffer.mapped);
  this.buffer = buffer;
};

Camera.prototype.resetSampleCount = function() {
  this.totalSampleCount = this.sampleCount;
};

Camera.prototype.transform = function() {
  let {layout} = this;
  let {rotation, distance} = this;

  let mView = this.viewMatrix;
  let mModel = this.modelMatrix;
  let mProjection = this.projectionMatrix;

  let translation = vec3.fromValues(0, 0, distance.z);

  mat4.identity(mModel);
  mat4.translate(mModel, mModel, translation);
  mat4.rotateX(mModel, mModel, rotation.y * Math.PI / 180);
  mat4.rotateY(mModel, mModel, rotation.x * Math.PI / 180);

  rotation.x += rotation.vx;
  rotation.y += rotation.vy;
  distance.z += distance.vz;

  rotation.vx *= SMOOTH_MOVEMENT;
  rotation.vy *= SMOOTH_MOVEMENT;
  distance.vz *= (SMOOTH_MOVEMENT + 0.125); // make distance change a bit smoother :)

  // accumulate only if camera is not moving at all
  if ((Math.abs(rotation.vx) + Math.abs(rotation.vy) + Math.abs(distance.vz)) !== 0) {
    this.resetSampleCount();
  }

  if (Math.abs(rotation.vx) < EPSILON) rotation.vx = 0;
  if (Math.abs(rotation.vy) < EPSILON) rotation.vy = 0;
  if (Math.abs(distance.vz) < EPSILON) distance.vz = 0;

  // write the camera's model matrix inverse to the view matrix instance
  mat4.invert(mView, mModel);

  // update matrices
  layout.set(`viewMatrix`, mView);
  layout.set(`projectionMatrix`, mProjection);
};

Camera.prototype.update = function() {
  let {layout} = this;

  this.transform();

  let uint32View = new Uint32Array(layout.buffer);
  let float32View = new Float32Array(layout.buffer);

  // TODO: make this less ugly

  // aperture
  float32View[32] = APERTURE;
  // focusDistance
  float32View[33] = FOCUS_DISTANCE;

  // sampleCount
  uint32View[34] = this.sampleCount;
  // totalSampleCount
  uint32View[35] = this.totalSampleCount;
  // bounceCount
  uint32View[36] = this.bounceCount;

  this.totalSampleCount += this.sampleCount;
};
