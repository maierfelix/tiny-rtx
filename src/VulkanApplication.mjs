import { LOG, WARN, ASSERT_VK_RESULT } from "./utils.mjs";

import {
  isValidationLayerAvailable
} from "./utils.mjs";

import Surface from "./Surface.mjs";
import Swapchain from "./Swapchain.mjs";
import LogicalDevice from "./LogicalDevice.mjs";
import PhysicalDevice from "./PhysicalDevice.mjs";

export default class VulkanApplication {
  constructor(opts = {}) {
    this.instance = null;
    this.logicalDevice = null;
    this.physicalDevice = null;
    this.surface = null;
    this.swapchain = null;
    this.window = null;
    this.desiredSurfaceFormat = opts.desiredSurfaceFormat || VK_FORMAT_B8G8R8A8_UNORM;
    this.validationLayers = opts.validationLayers || [];
    this.requiredExtensions = opts.requiredExtensions || [];
  }
};

VulkanApplication.prototype.create = function() {
  this.window = this.createWindow();
  this.instance = this.createInstance();
  this.physicalDevice = this.createPhysicalDevice();
  this.logicalDevice = this.createLogicalDevice();
  this.surface = this.createSurface();
  this.swapchain = this.createSwapchain();
};

VulkanApplication.prototype.destroy = function() {
  this.logicalDevice.destroy();
  this.physicalDevice.destroy();
  this.surface.destroy();
  this.swapchain.destroy();
  this.window.destroy();
  vkDestroyInstance(this.instance, null);
};

VulkanApplication.prototype.createWindow = function() {
  let window = new VulkanWindow({
    width: 1024 + 256,
    height: 768,
    title: "Vulkan RTX",
    resizable: false
  });
  return window;
};

VulkanApplication.prototype.createInstance = function() {
  let {window} = this;
  let {validationLayers} = this;
  let instance = new VkInstance();

  let extensions = window.getRequiredInstanceExtensions();
  extensions.push(VK_KHR_GET_PHYSICAL_DEVICE_PROPERTIES_2_EXTENSION_NAME);

  let applicationInfo = new VkApplicationInfo();
  applicationInfo.pApplicationName = "RTX";
  applicationInfo.applicationVersion = VK_MAKE_VERSION(1, 0, 0);
  applicationInfo.pEngineName = "No Engine";
  applicationInfo.engineVersion = VK_MAKE_VERSION(1, 0, 0);
  applicationInfo.apiVersion = VK_API_VERSION_1_1;

  let layers = [];
  for (let ii = 0; ii < validationLayers.length; ++ii) {
    let layerName = validationLayers[ii];
    if (isValidationLayerAvailable(layerName)) {
      layers.push(layerName); 
    } else {
      WARN(`Excluding validation layer '${layerName}' since it is not available`);
    }
  };

  let instanceInfo = new VkInstanceCreateInfo();
  instanceInfo.pApplicationInfo = applicationInfo;
  instanceInfo.enabledLayerCount = layers.length;
  instanceInfo.ppEnabledLayerNames = layers;
  instanceInfo.enabledExtensionCount = extensions.length;
  instanceInfo.ppEnabledExtensionNames = extensions;

  result = vkCreateInstance(instanceInfo, null, instance);
  ASSERT_VK_RESULT(result);

  return instance;
};

VulkanApplication.prototype.createPhysicalDevice = function() {
  let {instance} = this;
  let {requiredExtensions} = this;
  let physicalDevice = new PhysicalDevice({ instance, requiredExtensions });
  physicalDevice.create();
  if (!physicalDevice) throw new Error(`No compatible physical device available`);
  return physicalDevice;
};

VulkanApplication.prototype.createLogicalDevice = function() {
  let {physicalDevice} = this;
  let {requiredExtensions} = this;
  let logicalDevice = new LogicalDevice({ physicalDevice, requiredExtensions });
  LOG("Enabled Extensions:");
  requiredExtensions.map(ext => {
    LOG(` - ${ext}`);
  });
  logicalDevice.create();
  return logicalDevice;
};

VulkanApplication.prototype.createSurface = function() {
  let {window, physicalDevice, instance} = this;
  let surface = new Surface({ window, instance, physicalDevice });
  if (!surface.create(this.desiredSurfaceFormat)) {
    throw new Error("Failed to create surface!");
  }
  return surface;
};

VulkanApplication.prototype.createSwapchain = function() {
  let {window, surface, logicalDevice, physicalDevice} = this;
  let swapchain = new Swapchain({ window, surface, logicalDevice, physicalDevice });
  swapchain.create();
  return swapchain;
};

VulkanApplication.prototype.drawFrame = function() {

};

VulkanApplication.prototype.drawDefaultFrame = function() {
  let {window, swapchain, logicalDevice} = this;
  let {synchronization, drawCommandBuffers} = swapchain;
  let {imageAvailable, renderingAvailable, frameReadyFences} = synchronization;

  let device = logicalDevice.instance;
  let queue = logicalDevice.getGraphicsQueue();

  let imageIndex = { $: 0 };
  result = vkAcquireNextImageKHR(device, swapchain.instance, Number.MAX_SAFE_INTEGER, imageAvailable, null, imageIndex);
  ASSERT_VK_RESULT(result);

  let fence = frameReadyFences[imageIndex.$];
  result = vkWaitForFences(device, 1, [fence], true, Number.MAX_SAFE_INTEGER);
  ASSERT_VK_RESULT(result);
  result = vkResetFences(device, 1, [fence]);
  ASSERT_VK_RESULT(result);

  let waitStageMask = new Int32Array([VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT]);

  let submitInfo = new VkSubmitInfo();
  submitInfo.waitSemaphoreCount = 1;
  submitInfo.pWaitSemaphores = [imageAvailable];
  submitInfo.pWaitDstStageMask = waitStageMask;
  submitInfo.commandBufferCount = 1;
  submitInfo.pCommandBuffers = [drawCommandBuffers[imageIndex.$].instance];
  submitInfo.signalSemaphoreCount = 1;
  submitInfo.pSignalSemaphores = [renderingAvailable];

  result = vkQueueSubmit(queue, 1, [submitInfo], fence);
  ASSERT_VK_RESULT(result);

  let presentInfo = new VkPresentInfoKHR();
  presentInfo.waitSemaphoreCount = 1;
  presentInfo.pWaitSemaphores = [renderingAvailable];
  presentInfo.swapchainCount = 1;
  presentInfo.pSwapchains = [swapchain.instance];
  presentInfo.pImageIndices = new Uint32Array([imageIndex.$]);

  result = vkQueuePresentKHR(queue, presentInfo);
  if (result === VK_ERROR_OUT_OF_DATE_KHR) return window.close();
  ASSERT_VK_RESULT(result);
};
