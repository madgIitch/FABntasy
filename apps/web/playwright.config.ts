import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    storageState: process.env.E2E_STORAGE_STATE || undefined,
  },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: "corepack pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
  },
});
