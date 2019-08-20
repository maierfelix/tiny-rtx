export default class MemoryLayout {
  constructor(buffer = null) {
    if (this.constructor === MemoryLayout) {
      throw new TypeError(`MemoryLayout cannot be directly instantiated`);
    }
    let {constructor} = this;
    let {memoryLayout} = constructor;
    if (!memoryLayout) {
      throw new ReferenceError(`${constructor.name}: Missing .memoryLayout property`);
    }
    this.byteLength = constructor.byteLength;
    this.buffer = buffer || new ArrayBuffer(this.byteLength);
    if (buffer !== null && buffer.byteLength !== this.byteLength) {
      throw new RangeError(`Invalid byteLength for submitted input ArrayBuffer`);
    }
    this.view = new Int8Array(this.buffer);
    this.layout = this.createLayout(memoryLayout);
  }

  createLayout(layout) {
    let {view} = this;
    let out = {};
    let offset = 0;
    layout.map(l => {
      let entry = Object.entries(l)[0];
      let name = entry[0];
      let byteLength = entry[1];
      out[name] = view.subarray(offset, offset + byteLength);
      offset += byteLength;
    });
    return out;
  }

  set(name, value) {
    let dstView = this.layout[name];
    if (this.layout[name] === void 0) {
      throw new ReferenceError(`MemoryLayout doesn't have a member named '${name}'`);
    }
    if (value.constructor === Number) {
      dstView[0] = value;
    }
    else if (ArrayBuffer.isView(value)) {
      let srcView = new Int8Array(value.buffer);
      dstView.set(srcView, 0x0);
    }
    else if (value.constructor === ArrayBuffer) {
      let srcView = new Int8Array(value);
      dstView.set(srcView, 0x0);
    }
    else if (value.constructor === BigInt) {
      let srcView = new Int8Array(new BigInt64Array([value]).buffer);
      dstView.set(srcView, 0x0);
    }
    else {
      throw new TypeError(`Cannot handle value of type '${value ? value.constructor.name : value}'`);
    }
  }

  static getLayoutByteLength(layout) {
    let byteLength = 0;
    layout.map(l => byteLength += Object.values(l)[0]);
    return byteLength;
  };

  static get byteLength() {
    return MemoryLayout.getLayoutByteLength(this.memoryLayout);
  }

};
