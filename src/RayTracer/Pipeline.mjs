import { ASSERT_VK_RESULT } from "../utils.mjs";

export default class Pipeline {
  constructor(opts = {}) {
    this.instance = new VkPipeline();
    this.layout = new VkPipelineLayout();
    this.descriptorSet = new VkDescriptorSet();
    this.descriptorPool = new VkDescriptorPool();
    this.descriptorSetLayout = new VkDescriptorSetLayout();
    this.uniformBuffers = [];
    this.offscreenBuffer = opts.offscreenBuffer;
    this.accumulationBuffer = opts.accumulationBuffer;
    this.logicalDevice = opts.logicalDevice;
    this.shaderBindingTable = opts.shaderBindingTable;
    this.sceneGeometryBuffer = opts.sceneGeometryBuffer;
    this.sceneTextureBuffer = opts.sceneTextureBuffer;
  }
};

Pipeline.prototype.create = function() {
  this.createDescriptorSetLayout();
  this.createPipelineLayout();
  this.createRayTracingPipeline();
};

Pipeline.prototype.addUniformBuffer = function(object) {
  this.uniformBuffers.push(object.buffer);
};

Pipeline.prototype.createDescriptorSetLayout = function() {
  let {logicalDevice} = this;
  let {descriptorSetLayout} = this;
  let {sceneGeometryBuffer, sceneTextureBuffer} = this;

  let {attributes, faces, materials} = sceneGeometryBuffer.buffers;

  let asLayoutBinding = new VkDescriptorSetLayoutBinding();
  asLayoutBinding.binding = 0;
  asLayoutBinding.descriptorType = VK_DESCRIPTOR_TYPE_ACCELERATION_STRUCTURE_NV;
  asLayoutBinding.descriptorCount = 1;
  asLayoutBinding.stageFlags = VK_SHADER_STAGE_RAYGEN_BIT_NV | VK_SHADER_STAGE_CLOSEST_HIT_BIT_NV;
  asLayoutBinding.pImmutableSamplers = null;

  let outputImageLayoutBinding = new VkDescriptorSetLayoutBinding();
  outputImageLayoutBinding.binding = 1;
  outputImageLayoutBinding.descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_IMAGE;
  outputImageLayoutBinding.descriptorCount = 1;
  outputImageLayoutBinding.stageFlags = VK_SHADER_STAGE_RAYGEN_BIT_NV;
  outputImageLayoutBinding.pImmutableSamplers = null;

  let accumulationImageLayoutBinding = new VkDescriptorSetLayoutBinding();
  accumulationImageLayoutBinding.binding = 2;
  accumulationImageLayoutBinding.descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_IMAGE;
  accumulationImageLayoutBinding.descriptorCount = 1;
  accumulationImageLayoutBinding.stageFlags = VK_SHADER_STAGE_RAYGEN_BIT_NV;
  accumulationImageLayoutBinding.pImmutableSamplers = null;

  let uniformBufferBinding = new VkDescriptorSetLayoutBinding();
  uniformBufferBinding.binding = 3;
  uniformBufferBinding.descriptorType = VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER;
  uniformBufferBinding.descriptorCount = 1;
  uniformBufferBinding.stageFlags = VK_SHADER_STAGE_RAYGEN_BIT_NV | VK_SHADER_STAGE_CLOSEST_HIT_BIT_NV | VK_SHADER_STAGE_MISS_BIT_NV;

  let vertexBufferBinding = new VkDescriptorSetLayoutBinding();
  vertexBufferBinding.binding = 4;
  vertexBufferBinding.descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
  vertexBufferBinding.descriptorCount = attributes.length;
  vertexBufferBinding.stageFlags = VK_SHADER_STAGE_CLOSEST_HIT_BIT_NV;

  let indexBufferBinding = new VkDescriptorSetLayoutBinding();
  indexBufferBinding.binding = 5;
  indexBufferBinding.descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
  indexBufferBinding.descriptorCount = faces.length;
  indexBufferBinding.stageFlags = VK_SHADER_STAGE_CLOSEST_HIT_BIT_NV;

  let materialBufferBinding = new VkDescriptorSetLayoutBinding();
  materialBufferBinding.binding = 6;
  materialBufferBinding.descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
  materialBufferBinding.descriptorCount = materials.length;
  materialBufferBinding.stageFlags = VK_SHADER_STAGE_CLOSEST_HIT_BIT_NV;

  let materialTextureBinding = new VkDescriptorSetLayoutBinding();
  materialTextureBinding.binding = 7;
  materialTextureBinding.descriptorType = VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER;
  materialTextureBinding.descriptorCount = 1;
  materialTextureBinding.stageFlags = VK_SHADER_STAGE_CLOSEST_HIT_BIT_NV;

  let skyboxTextureBinding = new VkDescriptorSetLayoutBinding();
  skyboxTextureBinding.binding = 8;
  skyboxTextureBinding.descriptorType = VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER;
  skyboxTextureBinding.descriptorCount = 1;
  skyboxTextureBinding.stageFlags = VK_SHADER_STAGE_MISS_BIT_NV;

  let bindings = [
    asLayoutBinding,
    outputImageLayoutBinding,
    accumulationImageLayoutBinding,
    uniformBufferBinding,
    vertexBufferBinding,
    indexBufferBinding,
    materialBufferBinding,
    materialTextureBinding,
    skyboxTextureBinding
  ];

  let layoutInfo = new VkDescriptorSetLayoutCreateInfo();
  layoutInfo.pNext = null;
  layoutInfo.flags = 0;
  layoutInfo.bindingCount = bindings.length;
  layoutInfo.pBindings = bindings;

  result = vkCreateDescriptorSetLayout(logicalDevice.instance, layoutInfo, null, descriptorSetLayout);
  ASSERT_VK_RESULT(result);
};

Pipeline.prototype.createPipelineLayout = function() {
  let {logicalDevice} = this;
  let {layout, descriptorSetLayout} = this;
  let pipelineLayoutCreateInfo = new VkPipelineLayoutCreateInfo();
  pipelineLayoutCreateInfo.flags = 0;
  pipelineLayoutCreateInfo.setLayoutCount = 1;
  pipelineLayoutCreateInfo.pSetLayouts = [descriptorSetLayout];
  pipelineLayoutCreateInfo.pushConstantRangeCount = 0;
  pipelineLayoutCreateInfo.pPushConstantRanges = null;

  result = vkCreatePipelineLayout(logicalDevice.instance, pipelineLayoutCreateInfo, null, layout);
  ASSERT_VK_RESULT(result);
};

Pipeline.prototype.createRayTracingPipeline = function() {
  let {logicalDevice} = this;
  let {layout, instance} = this;
  let {shaderBindingTable} = this;

  let groups = shaderBindingTable.groups.map(g => g.stage);
  let stages = shaderBindingTable.shaders.map(s => s.shaderStageInfo);

  let rayTracingPipelineNVInfo = new VkRayTracingPipelineCreateInfoNV();
  rayTracingPipelineNVInfo.stageCount = stages.length;
  rayTracingPipelineNVInfo.pStages = stages;
  rayTracingPipelineNVInfo.groupCount = groups.length;
  rayTracingPipelineNVInfo.pGroups = groups;
  rayTracingPipelineNVInfo.maxRecursionDepth = 1;
  rayTracingPipelineNVInfo.layout = layout;
  rayTracingPipelineNVInfo.basePipelineHandle = null;
  rayTracingPipelineNVInfo.basePipelineIndex = 0;

  result = vkCreateRayTracingPipelinesNV(logicalDevice.instance, null, 1, [rayTracingPipelineNVInfo], null, [instance]);
  ASSERT_VK_RESULT(result);
};

Pipeline.prototype.createDescriptorSets = function(accelerationStructures) {
  let {logicalDevice} = this;
  let {offscreenBuffer, accumulationBuffer} = this;
  let {uniformBuffers, sceneGeometryBuffer, sceneTextureBuffer} = this;
  let {descriptorSet, descriptorPool, descriptorSetLayout} = this;

  let {attributes, faces, materials} = sceneGeometryBuffer.buffers;

  let poolSizes = [
    new VkDescriptorPoolSize({ type: VK_DESCRIPTOR_TYPE_ACCELERATION_STRUCTURE_NV, descriptorCount: 1 }),
    new VkDescriptorPoolSize({ type: VK_DESCRIPTOR_TYPE_STORAGE_IMAGE, descriptorCount: 2 }),
    new VkDescriptorPoolSize({ type: VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER, descriptorCount: 1 }),
    new VkDescriptorPoolSize({ type: VK_DESCRIPTOR_TYPE_STORAGE_BUFFER, descriptorCount: 3 }),
    new VkDescriptorPoolSize({ type: VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER, descriptorCount: 2 })
  ];

  let descriptorPoolCreateInfo = new VkDescriptorPoolCreateInfo();
  descriptorPoolCreateInfo.maxSets = 1;
  descriptorPoolCreateInfo.poolSizeCount = poolSizes.length;
  descriptorPoolCreateInfo.pPoolSizes = poolSizes;

  result = vkCreateDescriptorPool(logicalDevice.instance, descriptorPoolCreateInfo, null, descriptorPool);
  ASSERT_VK_RESULT(result);

  let descriptorSetAllocateInfo = new VkDescriptorSetAllocateInfo();
  descriptorSetAllocateInfo.descriptorPool = descriptorPool;
  descriptorSetAllocateInfo.descriptorSetCount = 1;
  descriptorSetAllocateInfo.pSetLayouts = [descriptorSetLayout];

  result = vkAllocateDescriptorSets(logicalDevice.instance, descriptorSetAllocateInfo, [descriptorSet]);
  ASSERT_VK_RESULT(result);

  let descriptorAccelerationStructureInfo = new VkWriteDescriptorSetAccelerationStructureNV();
  descriptorAccelerationStructureInfo.accelerationStructureCount = accelerationStructures.length;
  descriptorAccelerationStructureInfo.pAccelerationStructures = accelerationStructures.map(as => as.instance);

  let accelerationStructureWrite = new VkWriteDescriptorSet();
  accelerationStructureWrite.pNext = descriptorAccelerationStructureInfo;
  accelerationStructureWrite.dstSet = descriptorSet;
  accelerationStructureWrite.dstBinding = 0;
  accelerationStructureWrite.descriptorType = VK_DESCRIPTOR_TYPE_ACCELERATION_STRUCTURE_NV;
  accelerationStructureWrite.descriptorCount = 1;

  let outputImageWrite = new VkWriteDescriptorSet();
  outputImageWrite.dstSet = descriptorSet;
  outputImageWrite.dstBinding = 1;
  outputImageWrite.descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_IMAGE;
  outputImageWrite.descriptorCount = 1;
  outputImageWrite.pImageInfo = [
    new VkDescriptorImageInfo({ imageView: offscreenBuffer.imageView, imageLayout: VK_IMAGE_LAYOUT_GENERAL })
  ];

  let accumulationImageWrite = new VkWriteDescriptorSet();
  accumulationImageWrite.dstSet = descriptorSet;
  accumulationImageWrite.dstBinding = 2;
  accumulationImageWrite.descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_IMAGE;
  accumulationImageWrite.descriptorCount = 1;
  accumulationImageWrite.pImageInfo = [
    new VkDescriptorImageInfo({ imageView: accumulationBuffer.imageView, imageLayout: VK_IMAGE_LAYOUT_GENERAL })
  ];

  let uniformBufferWrite = new VkWriteDescriptorSet();
  uniformBufferWrite.dstSet = descriptorSet;
  uniformBufferWrite.dstBinding = 3;
  uniformBufferWrite.descriptorType = VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER;
  uniformBufferWrite.descriptorCount = uniformBuffers.length;
  uniformBufferWrite.pBufferInfo = uniformBuffers.map(buffer => {
    return new VkDescriptorBufferInfo({ buffer: buffer.instance, range: buffer.byteLength });
  });

  let vertexBufferWrite = new VkWriteDescriptorSet();
  vertexBufferWrite.dstSet = descriptorSet;
  vertexBufferWrite.dstBinding = 4;
  vertexBufferWrite.descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
  vertexBufferWrite.descriptorCount = attributes.length;
  vertexBufferWrite.pBufferInfo = attributes.map(buffer => {
    return new VkDescriptorBufferInfo({ buffer: buffer.instance, range: buffer.byteLength })
  });

  let indexBufferWrite = new VkWriteDescriptorSet();
  indexBufferWrite.dstSet = descriptorSet;
  indexBufferWrite.dstBinding = 5;
  indexBufferWrite.descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
  indexBufferWrite.descriptorCount = faces.length;
  indexBufferWrite.pBufferInfo = faces.map(buffer => {
    return new VkDescriptorBufferInfo({ buffer: buffer.instance, range: buffer.byteLength })
  });

  let materialBufferWrite = new VkWriteDescriptorSet();
  materialBufferWrite.dstSet = descriptorSet;
  materialBufferWrite.dstBinding = 6;
  materialBufferWrite.descriptorType = VK_DESCRIPTOR_TYPE_STORAGE_BUFFER;
  materialBufferWrite.descriptorCount = materials.length;
  materialBufferWrite.pBufferInfo = materials.map(buffer => {
    return new VkDescriptorBufferInfo({ buffer: buffer.instance, range: buffer.byteLength })
  });

  let {material} = sceneTextureBuffer.buffers;
  let materialTextureWrite = new VkWriteDescriptorSet();
  materialTextureWrite.dstSet = descriptorSet;
  materialTextureWrite.dstBinding = 7;
  materialTextureWrite.descriptorType = VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER;
  materialTextureWrite.descriptorCount = 1;
  materialTextureWrite.pImageInfo = [
    new VkDescriptorImageInfo({
      sampler: material.instance.sampler,
      imageView: material.instance.imageView,
      imageLayout: VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL
    })
  ];

  let {skybox} = sceneTextureBuffer.buffers;
  let skyboxTextureWrite = new VkWriteDescriptorSet();
  skyboxTextureWrite.dstSet = descriptorSet;
  skyboxTextureWrite.dstBinding = 8;
  skyboxTextureWrite.descriptorType = VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER;
  skyboxTextureWrite.descriptorCount = 1;
  skyboxTextureWrite.pImageInfo = [
    new VkDescriptorImageInfo({
      sampler: skybox.instance.sampler,
      imageView: skybox.instance.imageView,
      imageLayout: VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL
    })
  ];

  let descriptorWrites = [
    accelerationStructureWrite,
    outputImageWrite,
    accumulationImageWrite,
    uniformBufferWrite,
    vertexBufferWrite,
    indexBufferWrite,
    materialBufferWrite,
    materialTextureWrite,
    skyboxTextureWrite
  ];

  vkUpdateDescriptorSets(logicalDevice.instance, descriptorWrites.length, descriptorWrites, 0, null);
};

Pipeline.prototype.destroy = function() {

};
