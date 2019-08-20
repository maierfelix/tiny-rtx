#version 460
#extension GL_NV_ray_tracing : require

#include "utils.glsl"

struct RayPayload {
  vec4 colorAndDistance;
  vec4 scatterDirection;
  uint seed;
};

layout(location = 0) rayPayloadInNV RayPayload Ray;

void main() {
  //const float t = 0.5 * (normalize(gl_WorldRayDirectionNV).y + 1.0);
  vec3 color = vec3(0.0);
  Ray.colorAndDistance = vec4(ditherRGB(color, vec2(gl_LaunchIDNV.xy)), -1.0);
}
