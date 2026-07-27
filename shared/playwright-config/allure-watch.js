/**
 * Watches allure-results/ for new test results, auto-generates Allure Report,
 * and serves it via a Node.js HTTP server on a fixed port.
 * No Java needed for serving — only for generating.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const JAVA_HOME =
  "C:\\Program Files\\JetBrains\\IntelliJ IDEA Community Edition 2025.2.6.1\\jbr";

// Map each project to a unique port
// Combined dashboard (port 5253) is handled by dashboard/dashboard-watch.js
const PROJECT_PORTS = {
  api: 5254,
  authentication: 5255,
  cfd: 5256,
  istools: 5257,
  publisher: 5258,
};

// ROOT = the project directory this was launched from (e.g. projects/cfd),
// so this single shared script works for every project unmodified.
const ROOT = process.cwd();
const PROJECT_NAME = path.basename(ROOT);
const PORT = PROJECT_PORTS[PROJECT_NAME] || 5252; // fallback to 5252 if not found
const RESULTS_DIR = path.join(ROOT, "reports", "allure-results");
const REPORT_DIR = path.join(ROOT, "reports", "allure-report");

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

// ── Static file server ────────────────────────────────────────────────────────

function startServer(openBrowser) {
  if (httpServer) {
    if (openBrowser) openUrl();
    return;
  }

  httpServer = http.createServer((req, res) => {
    let urlPath = req.url.split("?")[0];
    if (urlPath === "/") urlPath = "/index.html";
    const filePath = path.join(REPORT_DIR, urlPath);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        fs.readFile(path.join(REPORT_DIR, "index.html"), (err2, html) => {
          if (err2) {
            res.writeHead(404);
            res.end("Not found");
            return;
          }
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(html);
        });
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
    console.log(`[allure-watch] Serving report at http://127.0.0.1:${PORT}/`);
    if (openBrowser) openUrl();
  });

  httpServer.on("error", (e) => {
    console.error(`[allure-watch] Server error: ${e.message}`);
  });
}

function openUrl() {
  try {
    execSync(`start http://127.0.0.1:${PORT}/`, { stdio: "pipe" });
  } catch {}
}

// ── File watcher ──────────────────────────────────────────────────────────────

// Copy history/ from the previously generated report into allure-results/
// BEFORE running `allure generate --clean`, so the trend/history graphs keep
// accumulating across every run instead of being lost when the report is
// regenerated.
function copyHistoryForward() {
  const oldHistory = path.join(REPORT_DIR, "history");
  const newHistory = path.join(RESULTS_DIR, "history");
  if (fs.existsSync(oldHistory)) {
    fs.cpSync(oldHistory, newHistory, { recursive: true });
  }
}

function generateAndRefresh() {
  console.log("\n[allure-watch] New results detected — generating report...");
  const env = { ...process.env, JAVA_HOME };

  copyHistoryForward();

  try {
    execSync(
      `npx allure generate "${RESULTS_DIR}" --clean -o "${REPORT_DIR}"`,
      { env, cwd: ROOT, stdio: "pipe" },
    );
    console.log(`[allure-watch] Done → http://127.0.0.1:${PORT}/`);
  } catch (e) {
    console.error(
      "[allure-watch] Generate failed:",
      e.stderr?.toString() || e.message,
    );
    return;
  }

  if (serverStarted) {
    openUrl();
  } else {
    startServer(true);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

// Kill other allure-watch.js instances (from previous runs)
try {
  const myPid = process.pid;
  const result = execSync(
    `wmic process where "CommandLine like '%allure-watch%' and ProcessId!=${myPid}" get ProcessId /format:value`,
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
      `[allure-watch] Killed ${pids.length} old watcher instance(s).`,
    );
} catch {}

// Kill old allure Java server processes (from previous allure open/serve)
try {
  execSync(
    "wmic process where \"CommandLine like '%allure-commandline%'\" call terminate",
    { stdio: "pipe" },
  );
} catch {}

if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Watch for .trigger file written by allure-trigger-reporter.ts
// This fires exactly once when Playwright finishes a test run (not per test)
const TRIGGER_FILE = path.join(RESULTS_DIR, ".trigger");
let lastTriggerMtime = 0;
try {
  lastTriggerMtime = fs.statSync(TRIGGER_FILE).mtimeMs;
} catch {}

console.log("[allure-watch] Waiting for test run to complete...");
console.log(
  "[allure-watch] Run tests in Playwright UI — report will open automatically.\n",
);

setInterval(() => {
  try {
    const mtime = fs.statSync(TRIGGER_FILE).mtimeMs;
    if (mtime > lastTriggerMtime) {
      lastTriggerMtime = mtime;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(generateAndRefresh, 500);
    }
  } catch {}
}, 500);
