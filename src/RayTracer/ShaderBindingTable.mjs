import { ASSERT_VK_RESULT } from "../utils.mjs";

import Buffer from "../Buffer.mjs";

export default class ShaderBindingTable {
  constructor(opts = {}) {
    this.buffer = null;
    this.instance = null;
    this.stages = [];
    this.shaders = opts.shaders;
    this.logicalDevice = opts.logicalDevice;
    this.physicalDevice = opts.physicalDevice;
    this.shaderGroupHandleSize = opts.shaderGroupHandleSize;
  }

  get size() {
    return this.stages.length * this.stride;
  }
  get stride() {
    return this.shaderGroupHandleSize;
  }

  get groups() {
    return this.stages;
  }

};

ShaderBindingTable.prototype.create = function(pipeline) {
  let {logicalDevice, physicalDevice} = this;
  let {size, stages} = this;

  let buffer = new Buffer({ logicalDevice, physicalDevice });
  buffer.allocate(
    new Uint8Array(size),
    VK_BUFFER_USAGE_TRANSFER_SRC_BIT | VK_BUFFER_USAGE_RAY_TRACING_BIT_NV,
    VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT
  );

  let groupNumber = 3;
  result = vkGetRayTracingShaderGroupHandlesNV(
    logicalDevice.instance,
    pipeline,
    0,
    groupNumber,
    size,
    buffer.mapped
  );
  ASSERT_VK_RESULT(result);

  buffer.unmap();
  this.buffer = buffer;
  this.instance = buffer.instance;
};

ShaderBindingTable.prototype.destroy = function() {

};

ShaderBindingTable.prototype.getOffset = function(stageKind) {
  let {stride, stages} = this;
  let offset = 0;
  switch (stageKind) {
    // 0
    case VK_SHADER_STAGE_RAYGEN_BIT_NV: {
      offset = 0;
    } break;
    // 1
    case VK_SHADER_STAGE_CLOSEST_HIT_BIT_NV: {
      let rayGenStages = stages.filter(
        s => s.kind === VK_SHADER_STAGE_RAYGEN_BIT_NV
      );
      offset = (rayGenStages.length) * stride;
    } break;
    // 2
    case VK_SHADER_STAGE_MISS_BIT_NV: {
      let rayGenStages = stages.filter(
        s => s.kind === VK_SHADER_STAGE_RAYGEN_BIT_NV
      );
      let rayClosestHitStages = stages.filter(
        s => s.kind === VK_SHADER_STAGE_CLOSEST_HIT_BIT_NV
      );
      offset = (rayGenStages.length + rayClosestHitStages.length) * stride;
    } break;
  };
  return offset;
};

ShaderBindingTable.prototype.createStage = function({
  kind, type,
  generalShader, closestHitShader, anyHitShader, intersectionShader
} = _) {
  let stage = new VkRayTracingShaderGroupCreateInfoNV();
  stage.type = type;
  stage.generalShader = generalShader;
  stage.closestHitShader = closestHitShader;
  stage.anyHitShader = anyHitShader;
  stage.intersectionShader = intersectionShader;
  return { kind, stage };
};

ShaderBindingTable.prototype.addStage = function(kind) {
  let {stages} = this;
  let type = VK_SHADER_UNUSED_NV;
  let generalShader = VK_SHADER_UNUSED_NV;
  let closestHitShader = VK_SHADER_UNUSED_NV;
  let anyHitShader = VK_SHADER_UNUSED_NV;
  let intersectionShader = VK_SHADER_UNUSED_NV;
  switch (kind) {
    case VK_SHADER_STAGE_RAYGEN_BIT_NV:
      type = VK_RAY_TRACING_SHADER_GROUP_TYPE_GENERAL_NV;
      generalShader = stages.length;
    break;
    case VK_SHADER_STAGE_CLOSEST_HIT_BIT_NV:
      type = VK_RAY_TRACING_SHADER_GROUP_TYPE_TRIANGLES_HIT_GROUP_NV;
      closestHitShader = stages.length;
    break;
    case VK_SHADER_STAGE_MISS_BIT_NV:
      type = VK_RAY_TRACING_SHADER_GROUP_TYPE_GENERAL_NV;
      generalShader = stages.length;
    break;
  };
  let stage = this.createStage({
    kind,
    type,
    generalShader,
    closestHitShader,
    anyHitShader,
    intersectionShader
  });
  stages.push(stage);
  return stage;
};
