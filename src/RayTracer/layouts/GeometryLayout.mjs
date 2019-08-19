import MemoryLayout from "../../MemoryLayout.mjs";

export default class GeometryLayout extends MemoryLayout {
  constructor(buffer) {
    super(buffer);
  }
};

GeometryLayout.memoryLayout = [
  { transform: 12 * Float32Array.BYTES_PER_ELEMENT },
  { instanceId: 3 }, // -> gl_InstanceCustomIndexNV
  { mask: 1 },
  { instanceOffset: 3 },
  { flags: 1 },
  { accelerationStructureHandle: 1 * BigUint64Array.BYTES_PER_ELEMENT }
];
