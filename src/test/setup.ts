import "@testing-library/jest-dom/vitest";

// jsdom lacks IntersectionObserver (used by framer-motion's whileInView) and matchMedia.
class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IO;

