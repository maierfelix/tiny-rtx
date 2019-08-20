import { ASSERT_VK_RESULT } from "./utils.mjs";

import { readBinarySPIRVShader } from "./utils.mjs";

export default class LogicalDevice {
  constructor(opts) {
    this.instance = new VkDevice();
    this.physicalDevice = opts.physicalDevice;
    this.queues = {
      compute:  new VkQueue(),
      graphics: new VkQueue(),
      transfer: new VkQueue()
    };
    this.queueFamilyIndices = opts.physicalDevice.getQueueFamilyIndices();
    if (opts.requiredExtensions) this.requiredExtensions = opts.requiredExtensions;
  }
};

LogicalDevice.prototype.create = function() {
  let {instance, physicalDevice} = this;
  let {requiredExtensions, queueFamilyIndices} = this;

  let queueCreateInfos = [];

  if (queueFamilyIndices.computeFamilyIndex !== -1) {
    queueCreateInfos.push(this.createDeviceQueue(queueFamilyIndices.computeFamilyIndex));
  }
  if (queueFamilyIndices.graphicsFamilyIndex !== -1) {
    queueCreateInfos.push(this.createDeviceQueue(queueFamilyIndices.graphicsFamilyIndex));
  }
  if (queueFamilyIndices.transferFamilyIndex !== -1) {
    queueCreateInfos.push(this.createDeviceQueue(queueFamilyIndices.transferFamilyIndex));
  }

  let descriptorIndexing = new VkPhysicalDeviceDescriptorIndexingFeaturesEXT();

  let deviceFeatures2 = new VkPhysicalDeviceFeatures2();
  deviceFeatures2.pNext = descriptorIndexing;

  vkGetPhysicalDeviceFeatures2(physicalDevice.instance, deviceFeatures2);

  let deviceInfo = new VkDeviceCreateInfo();
  deviceInfo.pNext = deviceFeatures2;
  deviceInfo.queueCreateInfoCount = queueCreateInfos.length;
  deviceInfo.pQueueCreateInfos = queueCreateInfos;
  deviceInfo.enabledExtensionCount = requiredExtensions.length;
  deviceInfo.ppEnabledExtensionNames = requiredExtensions;

  result = vkCreateDevice(physicalDevice.instance, deviceInfo, null, instance);
  ASSERT_VK_RESULT(result);

  if (result === VK_SUCCESS) {
    this.createDeviceQueues();
    return true;
  };
  return false;
};

LogicalDevice.prototype.destroy = function() {
  
};

LogicalDevice.prototype.getGraphicsQueue = function() {
  return this.queues.graphics;
};

LogicalDevice.prototype.getComputeQueue = function() {
  return this.queues.compute;
};

LogicalDevice.prototype.getTransferQueue = function() {
  return this.queues.transfer;
};

LogicalDevice.prototype.createDeviceQueue = function(queueFamilyIndex) {
  let {physicalDevice} = this;
  let deviceQueueInfo = new VkDeviceQueueCreateInfo();
  deviceQueueInfo.queueFamilyIndex = queueFamilyIndex;
  deviceQueueInfo.queueCount = 1;
  deviceQueueInfo.pQueuePriorities = new Float32Array([1.0, 1.0, 1.0, 1.0]);
  return deviceQueueInfo;
};

LogicalDevice.prototype.createDeviceQueues = function() {
  let {instance, physicalDevice} = this;
  let {queues, queueFamilyIndices} = this;
  if (queueFamilyIndices.computeFamilyIndex !== -1) {
    vkGetDeviceQueue(instance, queueFamilyIndices.computeFamilyIndex, 0, queues.compute);
  }
  if (queueFamilyIndices.graphicsFamilyIndex !== -1) {
    vkGetDeviceQueue(instance, queueFamilyIndices.graphicsFamilyIndex, 0, queues.graphics);
  }
  if (queueFamilyIndices.transferFamilyIndex !== -1) {
    vkGetDeviceQueue(instance, queueFamilyIndices.transferFamilyIndex, 0, queues.transfer);
  }
};

LogicalDevice.prototype.createShaderModule = function(shaderPath, stageBit) {
  let {instance} = this;

  let shaderSrc = readBinarySPIRVShader(shaderPath);

  let module = new VkShaderModule();
  let shaderModuleInfo = new VkShaderModuleCreateInfo();
  shaderModuleInfo.sType = VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO;
  shaderModuleInfo.pCode = shaderSrc;
  shaderModuleInfo.codeSize = shaderSrc.byteLength;
  result = vkCreateShaderModule(instance, shaderModuleInfo, null, module);
  ASSERT_VK_RESULT(result);

  let stage = new VkPipelineShaderStageCreateInfo();
  stage.stage = stageBit;
  stage.module = module;
  stage.pName = "main";
  stage.pSpecializationInfo = null;

  return {
    stage,
    module
  };
};
