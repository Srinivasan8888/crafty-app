/**
 * Global vitest setup — extends `expect` with jest-dom and vitest-axe
 * matchers, and provides any shims needed for jsdom-based component tests.
 */
import "@testing-library/jest-dom/vitest";
import "vitest-axe/extend-expect";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
