import '@testing-library/jest-dom';

beforeAll(() => {});
afterAll(() => {});
afterEach(() => {
  jest.clearAllMocks();
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(input) {
      const buf = Buffer.from(input, 'utf-8');
      return new Uint8Array(buf);
    }
    encodeInto(source, destination) {
      const encoded = this.encode(source);
      destination.set(encoded);
      return { read: source.length, written: encoded.length };
    }
  };
}

if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = class TextDecoder {
    decode(input) {
      if (!input) return '';
      return Buffer.from(input).toString('utf-8');
    }
  };
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.ok = init?.status ? init.status >= 200 && init.status < 300 : true;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || 'OK';
    }
    async json() {
      return {};
    }
    async text() {
      return '';
    }
  };
}

if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(url, options) {
      this.url = url;
      this.method = options?.method || 'GET';
      this.headers = options?.headers || {};
    }
  };
}

if (typeof Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init) {
      this.map = new Map();
      if (init) {
        Object.entries(init).forEach(([k, v]) => this.map.set(k, v));
      }
    }
    append(key, value) {
      this.map.set(key, value);
    }
    get(key) {
      return this.map.get(key) || null;
    }
    set(key, value) {
      this.map.set(key, value);
    }
  };
}

global.fetch = jest.fn();
