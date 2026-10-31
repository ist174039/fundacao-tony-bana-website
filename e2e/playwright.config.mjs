import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const localBaseUrl = "http://127.0.0.1:3100";

if (process.env.E2E_BASE_URL && process.env.E2E_BASE_URL !== localBaseUrl) {
  throw new Error(
    "Remote E2E targets are intentionally disabled. Run this suite against the local, isolated build."
  );
}

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  outputDir: "./test-results",
  use: {
    baseURL: localBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"], browserName: "chromium" },
    },
  ],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 -p 3100",
    cwd: repositoryRoot,
    url: localBaseUrl + "/platform/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      FTB_SCHOOLS_ENABLED: "false",
      FTB_STUDENTS_ENABLED: "false",
      FTB_MATERIAL_DONATIONS_ENABLED: "false",
      FTB_MATERIAL_DELIVERIES_ENABLED: "false",
      FTB_DOCUMENTS_ENABLED: "false",
      FTB_FAMILY_ASSESSMENTS_ENABLED: "false",
      FTB_GRANULAR_ACCESS_ENABLED: "false",
    },
  },
});
