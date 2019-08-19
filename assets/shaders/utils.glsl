#extension GL_EXT_control_flow_attributes : require

#pragma optionNV(fastmath on)
#pragma optionNV(ifcvt none)
#pragma optionNV(inline all)
#pragma optionNV(strict on)
#pragma optionNV(unroll all)

float schlick(const float NoR, const float IOR) {
  float r0 = (1.0 - IOR) / (1.0 + IOR);
  //r0 = clamp(r0 * r0, 0.0, 0.18);
  r0 = r0 * r0;
  return r0 + (1.0 - r0) * pow(1.0 - NoR, 5.0);
}

// rand functions taken from neo java lib and
// https://github.com/nvpro-samples/optix_advanced_samples/blob/master/src/optixIntroduction/optixIntro_07/shaders/random_number_generators.h

const uint LCG_A = 1664525u;
const uint LCG_C = 1013904223u;
const int MAX_RAND = 0x7fff;
const int IEEE_ONE = 0x3f800000;
const int IEEE_MASK = 0x007fffff;

uint tea(uint val0, uint val1) {
  uint v0 = val0;
  uint v1 = val1;
  uint s0 = 0;
  for (uint n = 0; n < 16; n++) {
    s0 += 0x9e3779b9;
    v0 += ((v1<<4)+0xa341316c)^(v1+s0)^((v1>>5)+0xc8013ea4);
    v1 += ((v0<<4)+0xad90777d)^(v0+s0)^((v0>>5)+0x7e95761e);
  }
  return v0;
}

uint rand(inout uint seed) { // random integer in the range [0, MAX_RAND]
  seed = 69069 * seed + 1;
  return ((seed = 69069 * seed + 1) & MAX_RAND);
}

float randf01(inout uint seed) { // random number in the range [0.0f, 1.0f]
  seed = (LCG_A * seed + LCG_C);
  return float(seed & 0x00FFFFFF) / float(0x01000000u);
}

float randf11(inout uint seed) { // random number in the range [-1.0f, 1.0f]
  uint i = 0;
  seed = LCG_A * seed + LCG_C;
  i = IEEE_ONE | (((rand(seed)) & IEEE_MASK) >> 9);
  return uintBitsToFloat(i) - 1.0;
}

vec2 randInUnitDisk(inout uint seed) {
  vec2 p = vec2(0);
  do {
    p = 2 * vec2(randf01(seed), randf01(seed)) - 1;
  } while (dot(p, p) >= 1);
  return p;
}

vec3 randInUnitSphere(inout uint seed) {
  vec3 p = vec3(0);
  do {
    p = 2 * vec3(randf01(seed), randf01(seed), randf01(seed)) - 1;
  } while (dot(p, p) >= 1);
  return p;
}

// source: internetz
vec3 hash32(vec2 p){
  vec3 p3 = fract(vec3(p.xyx) * vec3(443.8975,397.2973, 491.1871));
  p3 += dot(p3, p3.yxz + 19.19);
  return fract(vec3((p3.x + p3.y) * p3.z, (p3.x + p3.z) * p3.y, (p3.y + p3.z) * p3.x));
}

vec3 ditherRGB(vec3 c, vec2 seed){
  return c + hash32(seed) / 255.0;
}
