# qa-hub

QA monorepo (npm workspaces) — migrated from the single-project `PlaywrightTest`
repo into an independent, multi-project structure.

```
qa-hub/
├── projects/
│   ├── authentication/   ← automation + test-cases + reports (own package.json/playwright.config.ts)
│   ├── cfd/
│   ├── istools/
│   ├── publisher/
│   └── api/
├── shared/
│   ├── pages/              ← Page Objects (POM)
│   ├── base/               ← WebBase.ts
│   ├── utils/              ← helpers (function-helper, db-helper, jwt-helper, user-helper, users.json)
│   ├── templates/          ← test-case.template.md, spec.template.ts
│   └── playwright-config/  ← playwright.base.config.ts + allure scripts, shared by every project
├── dashboard/              ← merges every project's allure-results into one combined report
└── package.json            ← npm workspaces root
```

## Setup

```bash
npm install          # installs once for all workspaces (root, shared, projects/*, dashboard)
```

## Running tests

Each project is independently runnable (cwd = its own folder) or via root scripts:

```bash
npm run test:cfd            # only the cfd project
npm run test                # every project's "test" script (--workspaces --if-present)

# or from inside a project:
cd projects/cfd
npm test
npm run test:ui
npm run test:allure          # run + generate + open allure report for this project
```

## Shared code

Projects import shared Page Objects/helpers via the `@shared/*` TypeScript path
alias (configured in each project's `tsconfig.json` / resolved natively by
Playwright's TS transform), e.g.:

```ts
import { CFDPage } from "@shared/pages/cfd-page";
import { CFD_USERNAME, CFD_PASSWORD } from "@shared/utils/user-helper";
```

## Dashboard (combined report)

Each project runs its own Allure report server on a **unique port**:

| Project        | Port     | Command                                               |
| -------------- | -------- | ----------------------------------------------------- |
| api            | 5254     | `npm run allure:watch` (from projects/api)            |
| authentication | 5255     | `npm run allure:watch` (from projects/authentication) |
| cfd            | 5256     | `npm run allure:watch` (from projects/cfd)            |
| istools        | 5257     | `npm run allure:watch` (from projects/istools)        |
| publisher      | 5258     | `npm run allure:watch` (from projects/publisher)      |
| **Combined**   | **5253** | `npm run dashboard:watch` (from repo root)            |

### Quick start

```bash
# Terminal 1: Start the combined dashboard watcher (auto-refreshes on any test run)
npm run dashboard:watch

# Terminal 2+: Run tests in any project — the combined dashboard updates automatically
cd projects/cfd
npm run test:ui:allure

# Or run multiple projects
npm run test
```

### How it works

- `dashboard/dashboard-watch.js` (port 5253) watches all `projects/*/reports/allure-results/.trigger` files (written by `allure-trigger-reporter.ts` when tests finish).
- When any project's tests complete, the watcher:
  1. Merges all 5 projects' results into `dashboard/combined-allure-results/`
  2. Generates the combined report into `dashboard/combined-report/`
  3. Serves it on http://127.0.0.1:5253/

- Each project's own `allure-watch.js` (ports 5254–5258) watches that project's `allure-results/` separately.
  - Run from inside a project: `npm run allure:watch` (or `npm run test:ui:allure` to test + watch).

### Troubleshooting

**Port already in use?**

```bash
netstat -ano | findstr :5253
taskkill /PID <pid> /F
```

**Dashboard goes stale when running tests via VS Code Playwright extension?**

- That's expected if `dashboard:watch` is not running.
- Start `npm run dashboard:watch` from the repo root to auto-refresh.
  (The combined dashboard is **not** updated by `allure open` or `allure serve` — only by this watcher.)

## Adding a new project

1. Copy the folder layout of an existing project under `projects/<name>/`
   (`package.json`, `playwright.config.ts`, `tsconfig.json`, `automation/`, `test-cases/`, `reports/`).
2. Add it to `npm run test:<name>` in the root `package.json` (optional).
3. `npm install` at the root to link the new workspace.
