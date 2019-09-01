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

struct InstanceOffset {
  uint geometry;
  uint material;
  uint instance;
  uint pad_0;
};

layout(location = 0) rayPayloadInNV RayPayload Ray;

layout(binding = 0, set = 0) uniform accelerationStructureNV topLevelAS;

layout(binding = 4, set = 0, std430) readonly buffer GeometryBuffer {
  Vertex GeometryAttributes[];
} GeometryAttributesArray[];

layout(binding = 5, set = 0, std430) readonly buffer FacesBuffer {
  uvec4 Faces[];
} FaceArray[];

layout(binding = 6, set = 0, std430) readonly buffer MaterialBuffer {
  Material material;
} MaterialArray[];

layout(binding = 7, set = 0, std430) readonly buffer InstanceOffsetBuffer {
  InstanceOffset offset;
} InstanceOffsetArray[];

layout (binding = 8, set = 0) uniform sampler2DArray textureArray;

hitAttributeNV vec2 attribs;

void main() {

  const InstanceOffset instanceOffset = InstanceOffsetArray[nonuniformEXT((gl_InstanceCustomIndexNV >> 0) & 0xFFFFFF)].offset;

  const uint geometryId = instanceOffset.geometry;
  const uint materialId = instanceOffset.material;

  const uvec4 face = FaceArray[nonuniformEXT(geometryId)].Faces[gl_PrimitiveID];

  const Vertex v0 = GeometryAttributesArray[nonuniformEXT(geometryId)].GeometryAttributes[int(face.x)];
  const Vertex v1 = GeometryAttributesArray[nonuniformEXT(geometryId)].GeometryAttributes[int(face.y)];
  const Vertex v2 = GeometryAttributesArray[nonuniformEXT(geometryId)].GeometryAttributes[int(face.z)];

  const vec2 u0 = v0.uv.xy, u1 = v1.uv.xy, u2 = v2.uv.xy;
  const vec3 n0 = v0.normal.xyz, n1 = v1.normal.xyz, n2 = v2.normal.xyz;
  const vec3 t0 = v0.tangent.xyz, t1 = v1.tangent.xyz, t2 = v2.tangent.xyz;

  const Material material = MaterialArray[materialId].material;

  const vec2 uv = blerp(attribs, u0.xy, u1.xy, u2.xy);
  vec3 normal = blerp(attribs, n0.xyz, n1.xyz, n2.xyz);
  const vec3 tangent = blerp(attribs, t0.xyz, t1.xyz, t2.xyz);

  const vec3 normalWorld = normalize(gl_ObjectToWorldNV * vec4(normal, 0));
  const vec3 tangentWorld = normalize(gl_ObjectToWorldNV * vec4(tangent, 0));
  const vec3 bitangentWorld = cross(normalWorld, tangentWorld);
  const mat3 TBN = mat3(
    tangentWorld,
    bitangentWorld,
    normalWorld
  );

  const uint materialModel = material.materialModel;
  const float IOR = material.IOR;
  const uint textureIndex = material.textureIndex;

  vec3 normalTexture = texture(textureArray, vec3(uv, textureIndex + 1)).rgb * 2.0 - 1.0;
  normal = (TBN * normalTexture).xyz;

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
