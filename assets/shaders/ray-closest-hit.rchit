#version 460
#extension GL_NV_ray_tracing : require
#extension GL_EXT_nonuniform_qualifier : enable
#extension GL_GOOGLE_include_directive : enable

#include "utils.glsl"

const uint EMISSIVE = 0;
const uint METALLIC = 1;
const uint DIELECTRIC = 2;
const uint LAMBERTIAN = 3;

struct RayPayload {
  vec4 colorAndDistance;
  vec4 scatterDirection;
  uint seed;
};

struct Vertex {
  vec4 normal;
  vec4 tangent;
  vec2 uv;
  vec2 pad_0;
};

struct Material {
  vec3 color;
  uint materialModel;
  float IOR;
  uint textureIndex;
  vec2 pad0;
};

layout(location = 0) rayPayloadInNV RayPayload Ray;

layout(binding = 0, set = 0) uniform accelerationStructureNV topLevelAS;

layout(binding = 4, set = 0, std430) readonly buffer AttribsBuffer {
  Vertex VertexAttribs[];
} AttributeArray[];

layout(binding = 5, set = 0, std430) readonly buffer FacesBuffer {
  uvec4 Faces[];
} FaceArray[];

layout(binding = 6, set = 0, std430) readonly buffer MaterialBuffer {
  Material material;
} MaterialArray[];

layout (binding = 7, set = 0) uniform sampler2DArray textureArray;

hitAttributeNV vec2 attribs;

void main() {

  const uint instanceId = (gl_InstanceCustomIndexNV >> 16) & 0xFF;
  const uint materialId = (gl_InstanceCustomIndexNV >> 0) & 0xFFFF;

  const uvec4 face = FaceArray[nonuniformEXT(instanceId)].Faces[gl_PrimitiveID];

  const Vertex v0 = AttributeArray[nonuniformEXT(instanceId)].VertexAttribs[int(face.x)];
  const Vertex v1 = AttributeArray[nonuniformEXT(instanceId)].VertexAttribs[int(face.y)];
  const Vertex v2 = AttributeArray[nonuniformEXT(instanceId)].VertexAttribs[int(face.z)];

  const vec2 u0 = v0.uv.xy, u1 = v1.uv.xy, u2 = v2.uv.xy;
  const vec3 n0 = v0.normal.xyz, n1 = v1.normal.xyz, n2 = v2.normal.xyz;

  const vec2 uv = blerp(attribs, u0.xy, u1.xy, u2.xy);
  const vec3 normal = blerp(attribs, n0.xyz, n1.xyz, n2.xyz);

  const Material material = MaterialArray[materialId].material;

  const uint materialModel = material.materialModel;
  const float IOR = material.IOR;
  const uint textureIndex = material.textureIndex;

  const vec3 color = (
    textureIndex > 0 ? texture(textureArray, vec3(uv, textureIndex)).rgb : vec3(0)
  ) + material.color;

  const float NoR = dot(gl_WorldRayDirectionNV, normal);

  uint seed = Ray.seed;
  switch (materialModel) {
    case EMISSIVE:
      Ray = RayPayload(
        vec4(color, gl_HitTNV),
        vec4(1, 0, 0, 0),
        seed
      );
    break;
    case METALLIC:
      const vec3 reflected = reflect(gl_WorldRayDirectionNV, normal);
      const bool isScattered = dot(reflected, normal) > 0.0;
      Ray = RayPayload(
        isScattered ? vec4(color, gl_HitTNV) : vec4(0, 0, 0, -1),
        vec4(reflected + IOR * randInUnitSphere(seed), float(isScattered)),
        seed
      );
    break;
    case DIELECTRIC:
      const bool outside = NoR > 0;
      const vec3 outer = outside ? -normal : normal;
      const vec3 refracted = refract(gl_WorldRayDirectionNV, outer, outside ? IOR : 1 / IOR);
      const float reflectProb = refracted != vec3(0) ? schlick(outside ? NoR * IOR : -NoR, IOR) : 1.0;
      if (randf01(seed) < reflectProb) {
        Ray = RayPayload(vec4(color, gl_HitTNV), vec4(reflect(gl_WorldRayDirectionNV, normal), 1), seed);
      } else {
        Ray = RayPayload(vec4(color, gl_HitTNV), vec4(refracted, 1), seed);
      }
    break;
    case LAMBERTIAN:
      const vec4 scatter = vec4(normal + randInUnitSphere(seed), float(NoR < 0));
      Ray = RayPayload(vec4(color, gl_HitTNV), scatter, seed);
    break;
  };

}
