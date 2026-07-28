import type { PlaywrightTestConfig } from "@playwright/test";
import path from "path";
import { QASE_TOKEN } from "../../shared/utils/user-helper";

/**
 * Common Playwright settings shared by every project under projects/*.
 * Each project's own playwright.config.ts calls createBaseConfig(__dirname)
 * and may pass overrides (testIgnore, projects, use, etc.) as the 2nd arg.
 *
 * `projectDir` (each project's own __dirname) is used to build ABSOLUTE
 * paths for every output (testDir, reports/*, allure-results/, ...).
 * This is required because reporters like `html` and `allure-playwright`
 * resolve relative paths against `process.cwd()`, not against the config
 * file's location. Some runners (VS Code Test Explorer / Playwright "UI"
 * extension) launch `playwright test` with cwd = the workspace root instead
 * of `projects/<name>/`, which — with plain relative strings — silently
 * wrote all reports/allure-results into the repo root. Using absolute paths
 * makes reports land in the right project folder no matter how tests are
 * triggered (CLI, `test:ui`, VS Code Test Explorer/UI mode).
 *
 * Reports are written under the project's own `reports/` folder so each
 * project stays independently runnable, while dashboard/ can later merge
 * every project's reports/allure-results into one combined report.
 */
export function createBaseConfig(
  projectDir: string,
  overrides: Partial<PlaywrightTestConfig> = {},
): PlaywrightTestConfig {
  const reportsDir = path.join(projectDir, "reports");
  const allureResultsDir = path.join(reportsDir, "allure-results");

  const base: PlaywrightTestConfig = {
    testDir: path.join(projectDir, "automation"),
    outputDir: path.join(reportsDir, "test-results"),
    testIgnore: [
      "**/publisher/automation/PublisherStagTest.spec.ts",
      "**/istools/**",
      "**/cfd/**",
    ],
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 1 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 2 : 1,
    /* Increase test timeout for complex forms */
    timeout: process.env.CI ? 30000 : 120000,
    reporter: process.env.CI
      ? [
          [
            "html",
            {
              outputFolder: path.join(reportsDir, "playwright-report"),
              open: "never",
            },
          ],
          ["allure-playwright", { resultsDir: allureResultsDir }],
          ["list"],
        ]
      : [
          [
            "html",
            {
              outputFolder: path.join(reportsDir, "playwright-report"),
              open: "never",
            },
          ],
          ["allure-playwright", { resultsDir: allureResultsDir }],
          [
            "../../shared/playwright-config/allure-trigger-reporter.ts",
            { resultsDir: allureResultsDir },
          ],
          // [
          //   "playwright-qase-reporter",
          //   {
          //     mode: "testops",
          //     testops: {
          //       api: {
          //         token: QASE_TOKEN,
          //       },
          //       project: "QP",
          //       run: {
          //         complete: true,
          //       },
          //     },
          //   },
          // ],
        ],
    use: {
      trace: "on",
      screenshot: "only-on-failure",
      video: "retain-on-failure",
      // Run on CI in headless mode, local with visible browser for debugging
      headless: !!process.env.CI,
      launchOptions: {
        args: [
          "--start-maximized",
          "--disable-features=PasswordLeakDetection",
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--disable-features=BlockInsecurePrivateNetworkRequests",
          "--allow-insecure-localhost",
        ],
      },
      viewport: process.env.CI ? { width: 1920, height: 1080 } : null,
    },
    projects: [
      {
        name: "chromium",
        use: process.env.CI ? {} : { channel: "chrome" },
      },
    ],
  };

  return { ...base, ...overrides };
}
