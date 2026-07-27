/**
 * Watches EVERY project's reports/allure-results/.trigger file (written once
 * per Playwright run by allure-trigger-reporter.ts's onEnd — fires no matter
 * how the run was started: CLI, npm scripts, VS Code Test Explorer, or UI
 * mode) and, whenever any of them changes, merges all projects'
 * allure-results into dashboard/combined-allure-results and regenerates
 * dashboard/combined-report.
 *
 * Serves the combined report on http://127.0.0.1:5253/ via a plain Node
 * static server (no Java `allure open`, so nothing needs restarting and
 * there are no port-binding conflicts across runs) — just keep this running
 * and refresh (F5) the browser after any test run finishes, including
 * skipped-only runs.
 *
 * Run once from the repo root: npm run dashboard:watch
 * (mirrors the per-project shared/playwright-config/allure-watch.js pattern)
 */
const { execSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const JAVA_HOME =
  "C:\\Program Files\\JetBrains\\IntelliJ IDEA Community Edition 2025.2.6.1\\jbr";
const PORT = 5253;
// Must be run from the repo root (npm run dashboard:watch).
const ROOT = process.cwd();
const PROJECTS_DIR = path.join(ROOT, "projects");
const DASHBOARD_DIR = path.join(ROOT, "dashboard");
const COMBINED_RESULTS_DIR = path.join(
  DASHBOARD_DIR,
  "combined-allure-results",
);
const COMBINED_REPORT_DIR = path.join(DASHBOARD_DIR, "combined-report");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".zip": "application/zip",
  ".xml": "application/xml",
  ".csv": "text/csv",
};

let debounceTimer = null;
let httpServer = null;
let serverStarted = false;
let generating = false;

// ── Static file server ──────────────────────────────────────────────────────

function startServer() {
  if (httpServer) return;

  httpServer = http.createServer((req, res) => {
    let urlPath = req.url.split("?")[0];
    if (urlPath === "/") urlPath = "/index.html";
    const filePath = path.join(COMBINED_REPORT_DIR, urlPath);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        fs.readFile(
          path.join(COMBINED_REPORT_DIR, "index.html"),
          (err2, html) => {
            if (err2) {
              res.writeHead(404);
              res.end("Not found");
              return;
            }
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(html);
          },
        );
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
      });
      res.end(data);
    });
  });

  httpServer.listen(PORT, "127.0.0.1", () => {
    serverStarted = true;
    console.log(
      `[dashboard-watch] Serving combined report at http://127.0.0.1:${PORT}/`,
    );
  });

  httpServer.on("error", (e) => {
    console.error(`[dashboard-watch] Server error: ${e.message}`);
  });
}

// ── Merge + generate ─────────────────────────────────────────────────────────

function refresh() {
  if (generating) return;
  generating = true;

  console.log(
    "\n[dashboard-watch] Test run finished — refreshing combined report...",
  );
  const env = { ...process.env, JAVA_HOME };

  try {
    execSync("node merge-reports.js", { cwd: DASHBOARD_DIR, stdio: "pipe" });
    execSync(
      `npx allure generate "${COMBINED_RESULTS_DIR}" --clean -o "${COMBINED_REPORT_DIR}"`,
      { cwd: DASHBOARD_DIR, env, stdio: "pipe" },
    );
    console.log(
      `[dashboard-watch] Done — refresh http://127.0.0.1:${PORT}/ (F5)`,
    );
  } catch (e) {
    console.error(
      "[dashboard-watch] Refresh failed:",
      e.stderr?.toString() || e.message,
    );
  } finally {
    generating = false;
  }

  startServer();
}

// ── Init ─────────────────────────────────────────────────────────────────────

// Kill other dashboard-watch.js instances (from previous runs), same pattern
// as allure-watch.js uses for itself.
try {
  const myPid = process.pid;
  const result = execSync(
    `wmic process where "CommandLine like '%dashboard-watch%' and ProcessId!=${myPid}" get ProcessId /format:value`,
    { encoding: "utf8", stdio: "pipe" },
  );
  const pids = (result.match(/ProcessId=(\d+)/g) || [])
    .map((m) => m.split("=")[1])
    .filter(Boolean);
  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "pipe" });
    } catch {}
  }
  if (pids.length)
    console.log(
      `[dashboard-watch] Killed ${pids.length} old watcher instance(s).`,
    );
} catch {}

if (!fs.existsSync(PROJECTS_DIR)) {
  console.error(`[dashboard-watch] projects/ not found at ${PROJECTS_DIR}`);
  process.exit(1);
}

function listTriggerFiles() {
  return fs
    .readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) =>
      path.join(PROJECTS_DIR, d.name, "reports", "allure-results", ".trigger"),
    );
}

const triggerFiles = listTriggerFiles();
const lastMtimes = new Map();
for (const file of triggerFiles) {
  try {
    lastMtimes.set(file, fs.statSync(file).mtimeMs);
  } catch {
    lastMtimes.set(file, 0);
  }
}

startServer();
refresh(); // initial build so the report isn't empty before the first test run

console.log(
  "[dashboard-watch] Watching every project for finished test runs (any project, any run method)...\n",
);

setInterval(() => {
  for (const file of triggerFiles) {
    try {
      const mtime = fs.statSync(file).mtimeMs;
      if (mtime > (lastMtimes.get(file) ?? 0)) {
        lastMtimes.set(file, mtime);
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(refresh, 500);
      }
    } catch {}
  }
}, 500);
