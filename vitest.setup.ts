import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// globals를 끈 구성이라 RTL 자동 cleanup이 등록되지 않으므로 명시적으로 정리한다.
afterEach(() => {
  cleanup();
});
