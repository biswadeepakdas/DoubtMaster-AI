import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir:  "./e2e",
  timeout:  30_000,
  retries:  process.env.CI ? 2 : 0,
  workers:  process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["github"]],
  use: {
    baseURL:    process.env.BASE_URL ?? "http://localhost:3000",
    trace:      "on-first-retry",
    screenshot: "only-on-failure",
    video:      "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
  ],
  webServer: process.env.CI ? undefined : {
    command:             "pnpm dev",
    url:                 "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
})
