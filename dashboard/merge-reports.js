/**
 * Collects reports/allure-results from every project under projects/*
 * into dashboard/combined-allure-results/, so a single Allure report can be
 * generated across all projects (`npm run generate` / `npm run build`).
 *
 * Each project's result files already have unique UUID-based names, so a
 * plain flat copy is safe and does not need per-project prefixing.
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PROJECTS_DIR = path.resolve(ROOT, "..", "projects");
const COMBINED_DIR = path.join(ROOT, "combined-allure-results");
const COMBINED_REPORT_HISTORY_DIR = path.join(
  ROOT,
  "combined-report",
  "history",
);

function main() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    console.error(`[dashboard] projects/ not found at ${PROJECTS_DIR}`);
    process.exit(1);
  }

  // Carry the trend/history forward from the previous combined-report so
  // Allure's Trend widget keeps accumulating across every `npm run build`.
  const hasPreviousHistory = fs.existsSync(COMBINED_REPORT_HISTORY_DIR);

  fs.rmSync(COMBINED_DIR, { recursive: true, force: true });
  fs.mkdirSync(COMBINED_DIR, { recursive: true });

  if (hasPreviousHistory) {
    fs.cpSync(COMBINED_REPORT_HISTORY_DIR, path.join(COMBINED_DIR, "history"), {
      recursive: true,
    });
    console.log(
      "[dashboard] carried forward trend history from previous combined-report",
    );
  }

  const projectNames = fs
    .readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let totalFiles = 0;

  for (const name of projectNames) {
    const resultsDir = path.join(
      PROJECTS_DIR,
      name,
      "reports",
      "allure-results",
    );
    if (!fs.existsSync(resultsDir)) {
      console.log(`[dashboard] skip ${name}: no reports/allure-results yet`);
      continue;
    }

    const files = fs.readdirSync(resultsDir);
    for (const file of files) {
      const src = path.join(resultsDir, file);
      const dest = path.join(COMBINED_DIR, file);
      fs.cpSync(src, dest, { recursive: true });
    }
    console.log(`[dashboard] merged ${files.length} item(s) from ${name}`);
    totalFiles += files.length;
  }

  console.log(
    `[dashboard] Done. ${totalFiles} item(s) copied into ${COMBINED_DIR}`,
  );
  console.log(
    "[dashboard] Next: npm run generate (or npm run build) to produce combined-report/",
  );
}

main();
