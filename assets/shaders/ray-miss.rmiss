#version 460
#extension GL_NV_ray_tracing : require
#extension GL_GOOGLE_include_directive : enable

#include "utils.glsl"

struct RayPayload {
  vec4 colorAndDistance;
  vec4 scatterDirection;
  uint seed;
};

layout(location = 0) rayPayloadInNV RayPayload Ray;

layout (binding = 8, set = 0) uniform sampler2DArray skyboxArray;

void main() {
  const vec3 rd = normalize(gl_WorldRayDirectionNV.xyz);
  vec2 uv = vec2((1.0 + atan(rd.x, rd.z) / PI) / 2.0, acos(rd.y) / PI);

  const uint textureIndex = 1;
  const vec3 color = texture(skyboxArray, vec3(uv, textureIndex)).rgb;

  Ray.colorAndDistance = vec4(color, -1.0);
}
