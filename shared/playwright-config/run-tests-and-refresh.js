/**
 * Runs a test command and, once it finishes (pass OR fail), always refreshes
 * the combined Allure dashboard (merge + generate) so the report already
 * being served by `npm run dashboard:build` (allure open, port 5253) just
 * needs a browser refresh (F5) to show the latest results.
 *
 * Usage: node shared/playwright-config/run-tests-and-refresh.js <command> [...args]
 * Example: node shared/playwright-config/run-tests-and-refresh.js npm run test --workspace=projects/publisher
 */
const { spawnSync } = require("child_process");

const [command, ...args] = process.argv.slice(2);

if (!command) {
  console.error(
    "Usage: node shared/playwright-config/run-tests-and-refresh.js <command> [...args]",
  );
  process.exit(1);
}

const testRun = spawnSync(command, args, { stdio: "inherit", shell: true });

console.log("\n[dashboard] refreshing combined report...");
const refresh = spawnSync("npm", ["run", "dashboard:refresh"], {
  stdio: "inherit",
  shell: true,
});

if (refresh.status !== 0) {
  console.error("[dashboard] refresh failed, see output above");
}

process.exit(testRun.status ?? 1);
