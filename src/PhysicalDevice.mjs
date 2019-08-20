import { ASSERT_VK_RESULT } from "./utils.mjs";

export default class PhysicalDevice {
  constructor(opts) {
    this.instance = null;
    this.instanceHandle = opts.instance;
    this.queueFamilyIndices = null;
    if (opts.requiredExtensions) this.requiredExtensions = opts.requiredExtensions;
  }
};

PhysicalDevice.prototype.create = function() {
  let {instanceHandle} = this;
  let {requiredExtensions} = this;

  let physicalDevices = PhysicalDevice.getPhysicalDevices(instanceHandle);

  let compatibleDevice = null;
  let compatibleDevices = [];
  physicalDevices.map(physicalDevice => {
    let {properties} = PhysicalDevice.getDeviceProperties(physicalDevice);
    let availableExtensions = PhysicalDevice.getAvailableExtensions(physicalDevice);
    // pick physical device that supports all required extensions
    let isCompatible = true;
    requiredExtensions.map(required => {
      let extensionFound = availableExtensions.find(available => required === available.extensionName);
      if (!extensionFound) isCompatible = false;
    });
    // compatible physical device found, use it
    if (isCompatible) {
      compatibleDevices.push(physicalDevice);
    }
  });

  // user prefers discrete over integrated GPU
  if (global.PREFER_DISCRETE_GPU) {
    compatibleDevices.map(physicalDevice => {
      let {type} = PhysicalDevice.getDeviceProperties(physicalDevice);
      // take the first GPU we find, but only if it's discrete
      if (!compatibleDevice && type === "Discrete") {
        compatibleDevice = physicalDevice;
      }
    });
    // if we didn't find any discrete GPU
    // pick the first one we found, but also give a warning
    if (!compatibleDevice) {
      compatibleDevice = compatibleDevices[0];
      console.warn(`--prefer-discrete-gpu flag is active, but didn't find any compatible device`);
    }
  // simply pick the first GPU we encountered
  } else {
    compatibleDevice = compatibleDevices[0];
  }

  if (!compatibleDevice) throw new Error(`No compatible GPU found!`);

  this.instance = compatibleDevice;

  return compatibleDevice !== null;
};

PhysicalDevice.prototype.destroy = function() {
  
};

PhysicalDevice.prototype.getQueueFamilyIndex = function(flag) {
  let {instance} = this;

  let queueFamilyCount = { $:0 };
  vkGetPhysicalDeviceQueueFamilyProperties(instance, queueFamilyCount, null);
  let queueFamilies = [...Array(queueFamilyCount.$)].map(() => new VkQueueFamilyProperties());
  vkGetPhysicalDeviceQueueFamilyProperties(instance, queueFamilyCount, queueFamilies);

  for (let ii = 0; ii < queueFamilies.length; ++ii) {
    let queueFamily = queueFamilies[ii];
    if (queueFamily.queueCount > 0 && queueFamily.queueFlags & flag) return ii;
  };

  return -1;
};

PhysicalDevice.prototype.getDeviceProperties = function() {
  let {instance} = this;
  let {requiredExtensions} = this;
  let physicalDeviceTypes = ["Other", "Integrated", "Discrete", "Virtual", "CPU"];
  let deviceProperties = new VkPhysicalDeviceProperties();
  vkGetPhysicalDeviceProperties(instance, deviceProperties);
  let deviceType = physicalDeviceTypes[deviceProperties.deviceType];

  let out = {
    type: deviceType,
    properties: deviceProperties
  };

  // also include ray tracing properties, if extension is loaded
  if (requiredExtensions.indexOf(VK_NV_RAY_TRACING_EXTENSION_NAME) > -1) {
    let rayTracingProperties = new VkPhysicalDeviceRayTracingPropertiesNV();
    let deviceProperties2 = new VkPhysicalDeviceProperties2();
    deviceProperties2.pNext = rayTracingProperties;
    vkGetPhysicalDeviceProperties2(instance, deviceProperties2);
    out.rayTracing = rayTracingProperties;
  }

  return out;
};

PhysicalDevice.prototype.getQueueFamilyIndices = function() {
  if (this.queueFamilyIndices !== null) return this.queueFamilyIndices;
  let {instance} = this;
  let queueFamilyPropsCount = { $: 0 };
  let computeFamilyIndex = -1;
  let graphicsFamilyIndex = -1;
  let transferFamilyIndex = -1;
  vkGetPhysicalDeviceQueueFamilyProperties(instance, queueFamilyPropsCount, null);
  let queueFamiliyProps = [...Array(queueFamilyPropsCount.$)].map(() => new VkQueueFamilyProperties());
  vkGetPhysicalDeviceQueueFamilyProperties(instance, queueFamilyPropsCount, queueFamiliyProps);
  // compute
  for (let ii = 0; ii < queueFamilyPropsCount.$; ++ii) {
    let queueFamilyProp = queueFamiliyProps[ii];
    if (
      (queueFamilyProp.queueFlags & VK_QUEUE_COMPUTE_BIT) &&
      !(queueFamilyProp.queueFlags & VK_QUEUE_GRAPHICS_BIT)) { computeFamilyIndex = ii; break; }
  };
  // graphics
  for (let ii = 0; ii < queueFamilyPropsCount.$; ++ii) {
    let queueFamilyProp = queueFamiliyProps[ii];
    if (queueFamilyProp.queueFlags & VK_QUEUE_GRAPHICS_BIT) { graphicsFamilyIndex = ii; break; }
  };
  // transfer
  for (let ii = 0; ii < queueFamilyPropsCount.$; ++ii) {
    let queueFamilyProp = queueFamiliyProps[ii];
    if (
      (queueFamilyProp.queueFlags & VK_QUEUE_TRANSFER_BIT) &&
      !(queueFamilyProp.queueFlags & VK_QUEUE_GRAPHICS_BIT) &&
      !(queueFamilyProp.queueFlags & VK_QUEUE_COMPUTE_BIT)) { transferFamilyIndex = ii; break; }
  };
  this.queueFamilyIndices = {
    computeFamilyIndex,
    transferFamilyIndex,
    graphicsFamilyIndex
  };
  return this.queueFamilyIndices;
};

PhysicalDevice.prototype.getMemoryTypeIndex = function(typeFilter, propertyFlag) {
  let {instance} = this;
  let memoryProperties = new VkPhysicalDeviceMemoryProperties();
  vkGetPhysicalDeviceMemoryProperties(instance, memoryProperties);
  for (let ii = 0; ii < memoryProperties.memoryTypeCount; ++ii) {
    if (
      (typeFilter & (1 << ii)) &&
      (memoryProperties.memoryTypes[ii].propertyFlags & propertyFlag) === propertyFlag
    ) {
      return ii;
    }
  };
  console.warn(`Couldn't find a matching memory type index!`);
  return -1;
};

PhysicalDevice.getDeviceProperties = function(instance, requiredExtensions = []) {
  return PhysicalDevice.prototype.getDeviceProperties.call({ instance, requiredExtensions }, null);
};

PhysicalDevice.getAvailableExtensions = function(physicalDevice) {
  // retrieve extensions of physical device
  let extensionCount = { $: 0 };
  vkEnumerateDeviceExtensionProperties(physicalDevice, null, extensionCount, null);
  let availableExtensions = [...Array(extensionCount.$)].map(() => new VkExtensionProperties());
  vkEnumerateDeviceExtensionProperties(physicalDevice, null, extensionCount, availableExtensions);
  return availableExtensions;
};

PhysicalDevice.getPhysicalDevices = function(instanceHandle) {
  // get count of available physical devices
  let deviceCount = { $:0 };
  vkEnumeratePhysicalDevices(instanceHandle, deviceCount, null);
  if (deviceCount.$ <= 0) console.error("Error: No physical device available!");

  // retrieve array of available physical devices
  let physicalDevices = [...Array(deviceCount.$)].map(() => new VkPhysicalDevice());
  let result = vkEnumeratePhysicalDevices(instanceHandle, deviceCount, physicalDevices);
  ASSERT_VK_RESULT(result);

  return physicalDevices;
};
