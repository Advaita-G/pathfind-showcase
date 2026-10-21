import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    // Unit tests live next to the source, plus the build-time helpers in scripts/.
    // e2e/ holds Playwright specs, which must not be collected by vitest (it would try to
    // import @playwright/test in a node environment).
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.mjs"],
  },
});
