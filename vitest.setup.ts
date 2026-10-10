import { config } from '@vue/test-utils';

// 全局 mock element-plus 组件（按需替换）
config.global.stubs = {
  // Element Plus 组件会自动渲染，这里留空
};

// jsdom 不支持 matchMedia，提供 mock
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    })
  });
}

// jsdom 无 canvas，补齐 sheets-ui 扩展插件顶层 import 依赖的全局对象
if (typeof globalThis.Path2D === 'undefined') {
  class Path2DStub {
    addPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
    arc() {}
    arcTo() {}
    ellipse() {}
    rect() {}
  }
  (globalThis as any).Path2D = Path2DStub;
}
if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrixStub {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    inverse() { return this; }
    transformPoint(p?: any) { return { x: p?.x ?? 0, y: p?.y ?? 0, z: 0, w: 1 }; }
  }
  (globalThis as any).DOMMatrix = DOMMatrixStub;
}
if (typeof globalThis.ImageData === 'undefined') {
  (globalThis as any).ImageData = class ImageDataStub {
    width: number; height: number; data: Uint8ClampedArray;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
      this.data = new Uint8ClampedArray(width * height * 4);
    }
  };
}
