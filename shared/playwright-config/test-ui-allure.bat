@echo off
REM Generic script, meant to be run with cwd = a project folder (projects/<name>/).
REM Start allure watcher in background
start "" /B node ..\..\shared\playwright-config\allure-watch.js

REM Open Playwright UI (stays open)
npx playwright test --ui
