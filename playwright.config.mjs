import { defineConfig, devices } from "@playwright/test";

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  outputDir: "work/test-results",
  reporter: [["line"]],
  use: {
    baseURL: "http://127.0.0.1:8787",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: executablePath ? { executablePath } : undefined,
      },
    },
  ],
  webServer: {
    // This Worker is plain ESM. Skipping the unnecessary bundler prevents
    // Wrangler's file watcher from rebuilding while Playwright writes results.
    command: "node node_modules/wrangler/bin/wrangler.js dev --no-bundle --port 8787 --ip 127.0.0.1",
    url: "http://127.0.0.1:8787",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      WRANGLER_LOG_PATH: "work/wrangler.log",
      WRANGLER_SEND_METRICS: "false"
    }
  },
});
