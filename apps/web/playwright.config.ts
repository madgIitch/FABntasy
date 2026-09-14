import { defineConfig, devices } from "@playwright/test";

const viewports = {
  mobile: { width: 375, height: 812 },
  desktop: { width: 1440, height: 900 },
} as const;

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    storageState: process.env.E2E_STORAGE_STATE || undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium-mobile", use: { ...devices["Desktop Chrome"], viewport: viewports.mobile } },
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], viewport: viewports.desktop } },
    { name: "firefox-mobile", use: { ...devices["Desktop Firefox"], viewport: viewports.mobile } },
    { name: "firefox-desktop", use: { ...devices["Desktop Firefox"], viewport: viewports.desktop } },
    { name: "webkit-mobile", use: { ...devices["Desktop Safari"], viewport: viewports.mobile } },
    { name: "webkit-desktop", use: { ...devices["Desktop Safari"], viewport: viewports.desktop } },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: "corepack pnpm dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
  },
});
