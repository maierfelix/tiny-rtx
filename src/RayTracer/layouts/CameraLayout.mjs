import MemoryLayout from "../../MemoryLayout.mjs";

export default class CameraLayout extends MemoryLayout {
  constructor(buffer) {
    super(buffer);
  }
};

CameraLayout.memoryLayout = [
  { viewMatrix:       16 * Float32Array.BYTES_PER_ELEMENT },
  { projectionMatrix: 16 * Float32Array.BYTES_PER_ELEMENT },
  { aperture:          1 * Float32Array.BYTES_PER_ELEMENT },
  { focusDistance:     1 * Float32Array.BYTES_PER_ELEMENT },
  { sampleCount:       1 * Uint32Array.BYTES_PER_ELEMENT  },
  { totalSampleCount:  1 * Uint32Array.BYTES_PER_ELEMENT  },
  { bounceCount:       1 * Uint32Array.BYTES_PER_ELEMENT  }
];
