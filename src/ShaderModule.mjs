import fs from "fs";
import {GLSL} from "nvk-essentials";

import { ASSERT_VK_RESULT } from "./utils.mjs";

export default class ShaderModule {
  constructor(opts) {
    this.instance = new VkShaderModule();
    this.usage = opts.usage;
    this.entryPoint = opts.entryPoint;
    this.logicalDevice = opts.logicalDevice;
    this.shaderStageInfo = null;
  }
};

ShaderModule.prototype.create = function(source, extension, includesPath = "") {
  let {instance, logicalDevice} = this;
  if (!ArrayBuffer.isView(source)) throw new TypeError(`Invalid shader source type!`);
  let spirv = GLSL.toSPIRVSync({
    source,
    extension,
    includesPath
  });
  if (spirv.error) throw new Error(spirv.error);
  let shaderModuleInfo = new VkShaderModuleCreateInfo();
  shaderModuleInfo.pCode = spirv.output;
  shaderModuleInfo.codeSize = spirv.output.byteLength;
  result = vkCreateShaderModule(logicalDevice.instance, shaderModuleInfo, null, instance);
  ASSERT_VK_RESULT(result);

  let shaderStageInfo = new VkPipelineShaderStageCreateInfo();
  shaderStageInfo.stage = this.usage;
  shaderStageInfo.module = instance;
  shaderStageInfo.pName = this.entryPoint;
  this.shaderStageInfo = shaderStageInfo;

  return this;
};

ShaderModule.prototype.destroy = function() {
  let {instance} = this;

};

ShaderModule.prototype.fromFilePath = function(path, includesPath) {
  let source = fs.readFileSync(path);
  let extension = path.substr(path.lastIndexOf(".") + 1);
  return this.create(source, extension, includesPath);
};
