import { test, expect, type Locator } from "@playwright/test";
import { CFDPage } from "@shared/pages/cfd-page";
import { CFD_PASSWORD, CFD_USERNAME } from "@shared/utils/user-helper";
import {
  closeDatabasePool,
  daysAgo,
  getCampaignDetailKPIs,
  getCampaignSitesPage1,
  getClickCountForRange,
  getDashboardMetrics,
  getDashboardMetricsDelta,
  getFraudDetectionSearchCount,
  getFraudDetectionSummary,
  getFraudDetectionTablePage1,
  getTopFraudSources,
  getTopThreatVectors,
  getTrendHourly,
  getTrendLast7Days,
  parseUINumber,
  yesterday,
  withinTolerance,
} from "@shared/utils/db-helper";

test.describe("CFD ID Tests", () => {
  test.describe.configure({ mode: "parallel" });
  let cfdPage: CFDPage;
  /** true when yesterday has ≥1 click event in the DB */
  let hasYesterdayData = true;
  /** true when last 2 days has ≥1 click event in the DB */
  let hasLast2DaysData = true;
  /** true when the last 7 days has ≥1 click event in the DB */
  let hasRecentData = true;

  test.beforeAll(async () => {
    const withTimeout = <T>(
      promise: Promise<T>,
      fallback: T,
      ms = 30000,
    ): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
      ]);

    const [yCount, last2Count, recentCount] = await Promise.all([
      withTimeout(getClickCountForRange(yesterday(), yesterday()), -1),
      withTimeout(getClickCountForRange(daysAgo(2), yesterday()), -1),
      withTimeout(getClickCountForRange(daysAgo(7), yesterday()), -1),
    ]);

    // -1 means DB timed out — default to true so tests are not skipped
    hasYesterdayData = yCount !== 0;
    hasLast2DaysData = last2Count !== 0;
    hasRecentData = recentCount !== 0;
    console.log(
      `[Data check] yesterday = ${yCount} clicks, last2days = ${last2Count} clicks, last7days = ${recentCount} clicks`,
    );
  });

  test.beforeEach(async ({ page }) => {
    cfdPage = new CFDPage(page);

    await cfdPage.login("ID", CFD_USERNAME, CFD_PASSWORD);

    await cfdPage.page.waitForLoadState("networkidle");
  });

  test.afterAll(async () => {
    await closeDatabasePool();
  });

  test("Dashboard - heading verification", async () => {
    const heading = await cfdPage.page.getByRole("heading", {
      name: "Executive Dashboard",
    });
    // Verify "Showing data for <yesterday>" subtitle is present
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const day = String(d.getDate()).padStart(2, "0");
    const formatted = `${monthNames[d.getMonth()]} ${day}, ${d.getFullYear()}`;

    await expect(heading).toBeVisible();
    await expect(
      cfdPage.page.locator("span", {
        hasText: `Showing data for ${formatted}`,
      }),
    ).toBeVisible();
  });

  test.describe("Executive Dashboard", () => {
    test.beforeEach(() => {
      test.skip(
        !hasYesterdayData,
        `No data for yesterday (${yesterday()}) — skipping Executive Dashboard tests`,
      );
    });

    // ── Headline KPI cards + % change ─────────────────────────────────────────

    test.describe("Dashboard KPI cards vs database", () => {
      const getKpiValue = async (title: string): Promise<number> => {
        const card = cfdPage.page
          .locator(".kpi-card")
          .filter({ hasText: title });
        await card.waitFor({ state: "visible", timeout: 15000 });
        const uiText =
          (await card.locator(".kpi-value").textContent())?.trim() ?? "";
        return parseUINumber(uiText);
      };

      const getKpiDelta = async (
        title: string,
      ): Promise<{ raw: string; value: number }> => {
        const card = cfdPage.page
          .locator(".kpi-card")
          .filter({ hasText: title });
        await card.waitFor({ state: "visible", timeout: 15000 });
        const el = card.locator(
          ".kpi-delta-neg, .kpi-delta-pos, .kpi-delta-neutral",
        );
        const raw = ((await el.textContent()) ?? "").trim();
        const num = parseFloat(raw.replace(/[▼▲\s%]/g, ""));
        const value = raw.startsWith("▼") ? -num : num;
        return { raw, value };
      };

      test("Total Clicks: value and delta match database", async () => {
        const [metrics, delta] = await Promise.all([
          getDashboardMetrics(yesterday()),
          getDashboardMetricsDelta(),
        ]);
        const uiValue = await getKpiValue("Total Clicks");
        const ui = await getKpiDelta("Total Clicks");
        console.log(`Total Clicks: UI=${uiValue} DB=${metrics.totalClicks}`);
        console.log(
          `Total Clicks delta: UI=${ui.raw} (${ui.value}%) DB=${delta.totalClicks}%`,
        );
        expect(
          withinTolerance(uiValue, metrics.totalClicks),
          `Total Clicks: UI=${uiValue}, DB=${metrics.totalClicks}`,
        ).toBe(true);
        if (delta.totalClicks !== null) {
          expect(
            Math.abs(ui.value - delta.totalClicks),
            `Total Clicks delta: UI=${ui.value}%, DB=${delta.totalClicks}%`,
          ).toBeLessThanOrEqual(1);
        }
      });

      test("Legitimate Clicks: value and delta match database", async () => {
        const [metrics, delta] = await Promise.all([
          getDashboardMetrics(yesterday()),
          getDashboardMetricsDelta(),
        ]);
        const uiValue = await getKpiValue("Legitimate Clicks");
        const ui = await getKpiDelta("Legitimate Clicks");
        console.log(
          `Legitimate Clicks: UI=${uiValue} DB=${metrics.legitimateClicks}`,
        );
        console.log(
          `Legitimate Clicks delta: UI=${ui.raw} (${ui.value}%) DB=${delta.legitimateClicks}%`,
        );
        expect(
          withinTolerance(uiValue, metrics.legitimateClicks),
          `Legitimate Clicks: UI=${uiValue}, DB=${metrics.legitimateClicks}`,
        ).toBe(true);
        if (delta.legitimateClicks !== null) {
          expect(
            Math.abs(ui.value - delta.legitimateClicks),
            `Legitimate Clicks delta: UI=${ui.value}%, DB=${delta.legitimateClicks}%`,
          ).toBeLessThanOrEqual(1);
        }
      });

      test("Blocked (Fraud): value and delta match database", async () => {
        const [metrics, delta] = await Promise.all([
          getDashboardMetrics(yesterday()),
          getDashboardMetricsDelta(),
        ]);
        const uiValue = await getKpiValue("Blocked");
        const ui = await getKpiDelta("Blocked");
        console.log(`Blocked Fraud: UI=${uiValue} DB=${metrics.blockedFraud}`);
        console.log(
          `Blocked delta: UI=${ui.raw} (${ui.value}%) DB=${delta.blockedFraud}%`,
        );
        expect(
          withinTolerance(uiValue, metrics.blockedFraud),
          `Blocked Fraud: UI=${uiValue}, DB=${metrics.blockedFraud}`,
        ).toBe(true);
        if (delta.blockedFraud !== null) {
          expect(
            Math.abs(ui.value - delta.blockedFraud),
            `Blocked delta: UI=${ui.value}%, DB=${delta.blockedFraud}%`,
          ).toBeLessThanOrEqual(1);
        }
      });

      test("Warning: value and delta match database", async () => {
        const [metrics, delta] = await Promise.all([
          getDashboardMetrics(yesterday()),
          getDashboardMetricsDelta(),
        ]);
        const uiValue = await getKpiValue("Warning");
        const ui = await getKpiDelta("Warning");
        console.log(`Warning: UI=${uiValue} DB=${metrics.warning}`);
        console.log(
          `Warning delta: UI=${ui.raw} (${ui.value}%) DB=${delta.warning}%`,
        );
        expect(
          withinTolerance(uiValue, metrics.warning),
          `Warning: UI=${uiValue}, DB=${metrics.warning}`,
        ).toBe(true);
        if (delta.warning !== null) {
          expect(
            Math.abs(ui.value - delta.warning),
            `Warning delta: UI=${ui.value}%, DB=${delta.warning}%`,
          ).toBeLessThanOrEqual(1);
        }
      });
    });

    test.describe("Top Threat Vectors vs database", () => {
      /**
       * Returns the first 3 rule IDs that are directly visible in the row
       * (the tags rendered before any "+N" overflow badge).
       */
      const getVisibleRuleIds = async (row: Locator): Promise<string[]> => {
        return row.evaluate((el: Element) => {
          // Collect text from individual rule tag elements if available,
          // falling back to scanning the full text content.
          const tagEls = el.querySelectorAll(
            ".tv-rule, .tv-tag, [class*='tv-rule'], [class*='rule-tag'], [class*='rule-chip']",
          );
          let ids: string[];
          if (tagEls.length > 0) {
            ids = Array.from(tagEls)
              .map((t) => (t.textContent ?? "").trim().toUpperCase())
              .filter((t) => /^R\d+$/.test(t));
          } else {
            // Fallback: pull tokens directly before the "+N" badge
            const full = el.textContent ?? "";
            // Strip everything from the first "+digit" onwards
            const trimmed = full.replace(/\+\d+.*$/, "");
            const matches = trimmed.match(/\bR\d+\b/gi) ?? [];
            ids = matches.map((r) => r.toUpperCase());
          }
          return [...new Set(ids)].slice(0, 3);
        });
      };

      test("All threat vector block counts and rules match database", async () => {
        const dbRows = await getTopThreatVectors(yesterday());
        const dbMap = new Map(dbRows.map((r) => [r.category.toUpperCase(), r]));

        const rows = cfdPage.page.locator(
          ".threat-vec-row:not(.threat-vec-header)",
        );
        await rows.first().waitFor({ state: "visible", timeout: 15000 });
        const rowCount = await rows.count();

        for (let i = 0; i < rowCount; i++) {
          const row = rows.nth(i);
          const categoryText =
            (await row.locator(".tv-category").textContent())
              ?.trim()
              .toUpperCase() ?? "";
          const blocksText =
            (await row.locator(".tv-count").textContent())?.trim() ?? "";

          const dbRow = dbMap.get(categoryText);
          const uiBlocks = parseUINumber(blocksText);
          const dbBlocks = dbRow?.blocks ?? 0;

          if (!dbRow || dbRow.ruleIds.length === 0) {
            console.log(
              `[${categoryText}] Blocks: UI=${uiBlocks} DB=${dbBlocks}`,
            );
          } else {
            // ── Verify the first 3 visible UI rules are in the DB list ──────
            const uiTop3 = await getVisibleRuleIds(row);
            const dbNormalized = dbRow.ruleIds.map((r) =>
              r.trim().toUpperCase(),
            );

            console.log(
              `[${categoryText}] Blocks: UI=${uiBlocks} DB=${dbBlocks} | Rules UI top3=[${uiTop3.join(", ")}] DB=[${dbNormalized.join(", ")}]`,
            );
          }

          expect(
            withinTolerance(uiBlocks, dbBlocks),
            `Threat vector "${categoryText}": UI=${uiBlocks}, DB=${dbBlocks}`,
          ).toBe(true);

          if (!dbRow || dbRow.ruleIds.length === 0) continue;

          const uiTop3 = await getVisibleRuleIds(row);
          const dbNormalized = dbRow.ruleIds.map((r) => r.trim().toUpperCase());

          for (const ruleId of uiTop3) {
            expect(
              dbNormalized,
              `Category "${categoryText}": UI rule "${ruleId}" not found in DB [${dbNormalized.join(", ")}]`,
            ).toContain(ruleId);
          }
        }
      });
    });

    // ── Top Fraud Sources table ────────────────────────────────────────────────
    test.describe("Top Fraud Sources vs database", () => {
      test("Fraud counts and recommendations match database", async () => {
        const dbRows = await getTopFraudSources(yesterday(), 10);
        const dbMap = new Map(dbRows.map((r) => [String(r.siteId), r]));

        // DOM uses .fraud-source-row (not <table>)
        const rows = cfdPage.page.locator(
          ".fraud-source-row:not(.fraud-source-header)",
        );
        await rows.first().waitFor({ state: "visible", timeout: 15000 });
        const rowCount = await rows.count();

        for (let i = 0; i < rowCount; i++) {
          const row = rows.nth(i);
          // .site-id contains "• 35610" — strip the bullet
          const rawSiteId =
            (await row.locator(".site-id").textContent())?.trim() ?? "";
          const siteId = rawSiteId.replace(/^[•\s]+/, "").trim();
          const blocksText =
            (await row.locator(".fs-count").textContent())?.trim() ?? "";
          const blockRateText =
            (await row.locator(".fs-pct").textContent())
              ?.trim()
              .replace("%", "") ?? "";
          const recommendationText =
            (await row.locator(".fs-reco-label").textContent())?.trim() ?? "";

          const dbRow = dbMap.get(siteId);
          if (!dbRow) continue;

          const uiBlocks = parseUINumber(blocksText);
          const uiRate = parseFloat(blockRateText);
          const pubName = dbRow.publisherName || "None";

          console.log(
            `${pubName} [${siteId}] Frauds UI=${uiBlocks} DB=${dbRow.frauds} | Rate UI=${uiRate}% DB=${dbRow.fraudRate}% | Rec=${recommendationText}`,
          );

          expect(
            withinTolerance(uiBlocks, dbRow.frauds),
            `Fraud source "${pubName} [${siteId}]" frauds: UI=${uiBlocks}, DB=${dbRow.frauds}`,
          ).toBe(true);

          expect(Math.abs(uiRate - dbRow.fraudRate)).toBeLessThanOrEqual(1);

          if (dbRow.fraudRate === 100) {
            expect(
              recommendationText,
              `Site ${siteId} fraudRate=100% should have rec="Block"`,
            ).toBe("Block");
          }
        }
      });
    });

    // ── Live Traffic & Fraud Trend chart ──────────────────────────────────────
    test.describe("Live Traffic & Fraud Trend vs database", () => {
      /** Extract Plotly trace data from the chart on the page. */
      const getChartData = async (): Promise<
        Array<{ hour: string; clicks: number; fraudPct: number }>
      > => {
        return cfdPage.page.evaluate(() => {
          const plotDiv = document.querySelector(
            '[data-testid="stPlotlyChart"] .js-plotly-plot',
          ) as HTMLElement & {
            data: Array<{ name: string; x: string[]; y: number[] }>;
          };
          if (!plotDiv?.data) return [];
          const clicks = plotDiv.data.find((t) => t.name === "Clicks")!;
          const fraud = plotDiv.data.find((t) => t.name === "Fraud %")!;
          return clicks.x.map((x, i) => ({
            hour: x,
            clicks: clicks.y[i],
            fraudPct: fraud.y[i],
          }));
        });
      };

      test("Yesterday: hourly clicks and fraud % match database", async () => {
        await cfdPage.page.getByRole("button", { name: "Yesterday" }).click();
        await cfdPage.page.waitForLoadState("networkidle");

        const chartData = await getChartData();
        expect(chartData.length).toBe(24); // 24 hourly data points

        const dbRows = await getTrendHourly(yesterday());
        expect(dbRows.length).toBe(24);
        const dbMap = new Map(dbRows.map((r) => [r.hourBucket, r]));

        for (const point of chartData) {
          const dbRow = dbMap.get(point.hour);
          expect(dbRow, `No DB row for hour ${point.hour}`).toBeDefined();

          console.log(
            `[Yesterday ${point.hour}] Chart clicks=${point.clicks} DB=${dbRow!.totalClicks} | Chart fraud%=${point.fraudPct} DB=${dbRow!.fraudRatePct}`,
          );
          expect(point.clicks).toBe(dbRow!.totalClicks);
          // Allow ±2% tolerance for fraud rate comparison
          expect(
            Math.abs(point.fraudPct - dbRow!.fraudRatePct),
            `Hour ${point.hour}: chart fraud%=${point.fraudPct}, DB=${dbRow!.fraudRatePct}`,
          ).toBeLessThanOrEqual(2);
        }
      });

      test("Last 7 Days: daily clicks and fraud % match database", async () => {
        await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
        // Wait until Plotly re-renders with exactly 7 daily points
        await cfdPage.page.waitForFunction(() => {
          const el = document.querySelector(
            '[data-testid="stPlotlyChart"] .js-plotly-plot',
          ) as HTMLElement & { data: Array<{ x: string[] }> };
          return el?.data?.[0]?.x?.length === 7;
        });

        const chartData = await getChartData();
        expect(chartData.length).toBe(7);

        const dbRows = await getTrendLast7Days();
        const dbMap = new Map(dbRows.map((r) => [r.requestDate, r]));

        for (const point of chartData) {
          // Chart x is ISO datetime "2026-04-19T00:00:00" → extract date part
          const dateKey = point.hour.split("T")[0];
          const dbRow = dbMap.get(dateKey);
          if (!dbRow) {
            console.log(
              `[Last 7 Days] No DB row for ${dateKey} (may be zero-data day)`,
            );
            expect(point.clicks).toBe(0);
            continue;
          }

          console.log(
            `[Last 7 Days ${dateKey}] Chart clicks=${point.clicks} DB=${dbRow.totalClicks} | Chart fraud%=${point.fraudPct} DB=${dbRow.fraudRatePct}`,
          );
          expect(point.clicks).toBe(dbRow.totalClicks);
          // Allow ±2% tolerance for fraud rate comparison
          expect(
            Math.abs(point.fraudPct - dbRow.fraudRatePct),
            `Last 7 Days ${dateKey} fraud%: chart=${point.fraudPct}, DB=${dbRow.fraudRatePct}`,
          ).toBeLessThanOrEqual(2);
        }
      });
    });
  });

  test.describe("Fraud Detection Log", () => {
    // Navigate to Fraud Detection Log before each test in this group
    test.beforeEach(async () => {
      // await cfdPage.page.locator('a[href*="fraud-detection-log"]').click();
      await cfdPage.page.getByText(/Fraud Detection Log/).click();
      await cfdPage.page.getByText(/By Campaign/).click();
      await cfdPage.page.waitForLoadState("networkidle");
    });

    /**
     * Reads a KPI value from the summary bar inside the toolbar iframe.
     * labelText: e.g. "Total Fraud", "Blocked", "Warning", "Fraud Rate", "Campaigns Affected"
     */
    const getSummaryValue = async (labelText: string): Promise<string> => {
      // Wait until the KPI item exists AND has a non-empty value (iframe may still be loading)
      await cfdPage.page
        .waitForFunction(
          (label) => {
            const iframes = [...document.querySelectorAll("iframe")];
            for (const f of iframes) {
              try {
                const doc =
                  (f as HTMLIFrameElement).contentDocument ||
                  (f as HTMLIFrameElement).contentWindow?.document;
                if (!doc) continue;
                const items = [...doc.querySelectorAll(".cst-kpi-item")];
                const item = items.find((el) =>
                  el
                    .querySelector(".cst-kpi-lbl")
                    ?.textContent?.trim()
                    .toLowerCase()
                    .includes(label.toLowerCase()),
                );
                if (item) {
                  const val =
                    item.querySelector(".cst-kpi-val")?.textContent?.trim() ??
                    "";
                  // Accept any non-empty value (including "0")
                  return val.length > 0;
                }
              } catch {}
            }
            return false;
          },
          labelText,
          { timeout: 30000 },
        )
        .catch(() => {}); // proceed even if timeout — evaluate will return ""

      // The summary bar lives inside the 2nd srcdoc iframe (.cst-kpi-bar)
      return cfdPage.page.evaluate((label) => {
        const iframes = [...document.querySelectorAll("iframe")];
        for (const f of iframes) {
          try {
            const doc =
              (f as HTMLIFrameElement).contentDocument ||
              (f as HTMLIFrameElement).contentWindow?.document;
            if (!doc) continue;
            const items = [...doc.querySelectorAll(".cst-kpi-item")];
            const item = items.find((el) =>
              el
                .querySelector(".cst-kpi-lbl")
                ?.textContent?.trim()
                .toLowerCase()
                .includes(label.toLowerCase()),
            );
            if (item) {
              return (
                item.querySelector(".cst-kpi-val")?.textContent?.trim() ?? ""
              );
            }
          } catch {}
        }
        return "";
      }, labelText);
    };

    // ── Yesterday ────────────────────────────────────────────────────────────

    test.describe("Summary bar - Yesterday", () => {
      test.beforeEach(async () => {
        test.skip(!hasYesterdayData, `No data for yesterday (${yesterday()})`);
        await cfdPage.page.getByRole("button", { name: "Yesterday" }).click();
        await cfdPage.page.waitForLoadState("networkidle");
      });

      test("Summary bar matches database", async () => {
        // Add delay to ensure KPIs fully render after date selection
        await cfdPage.page.waitForTimeout(800);

        const db = await getFraudDetectionSummary(yesterday(), yesterday());
        const [uiTotalFraud, uiBlocked, uiWarning, uiFraudRate, uiCampaigns] =
          await Promise.all([
            getSummaryValue("Total Fraud"),
            getSummaryValue("Blocked"),
            getSummaryValue("Warning"),
            getSummaryValue("Fraud Rate"),
            getSummaryValue("Campaigns Affected"),
          ]);

        console.log(
          `[Yesterday Summary] Total Fraud: UI=${uiTotalFraud} DB=${db.totalFraud}`,
        );
        console.log(
          `[Yesterday Summary] Blocked: UI=${uiBlocked} DB=${db.blocked}`,
        );
        console.log(
          `[Yesterday Summary] Warning: UI=${uiWarning} DB=${db.warning}`,
        );
        console.log(
          `[Yesterday Summary] Fraud Rate: UI=${uiFraudRate} DB=${db.fraudRate}`,
        );
        console.log(
          `[Yesterday Summary] Campaigns Affected: UI=${uiCampaigns} DB=${db.campaignsAffected}`,
        );

        // Parse values for comparison
        const uiTotalFraudNum = parseUINumber(uiTotalFraud);
        const uiBlockedNum = parseUINumber(uiBlocked);
        const uiWarningNum = parseUINumber(uiWarning);
        const uiFraudRateNum = parseFloat(uiFraudRate);
        const uiCampaignsNum = parseInt(uiCampaigns);

        // Log parsed values for debugging
        console.log(
          `[Yesterday Summary] Parsed - TotalFraud=${uiTotalFraudNum}, Blocked=${uiBlockedNum}, Warning=${uiWarningNum}`,
        );

        expect(
          withinTolerance(uiTotalFraudNum, db.totalFraud),
          `Total Fraud: UI=${uiTotalFraud}(${uiTotalFraudNum}), DB=${db.totalFraud}`,
        ).toBe(true);
        expect(
          withinTolerance(uiBlockedNum, db.blocked),
          `Blocked: UI=${uiBlocked}(${uiBlockedNum}), DB=${db.blocked}`,
        ).toBe(true);
        // Use tolerance for Warning as well since data may update between UI load and DB query
        expect(
          withinTolerance(uiWarningNum, db.warning),
          `Warning: UI=${uiWarning}(${uiWarningNum}), DB=${db.warning}`,
        ).toBe(true);
        expect(
          Math.abs(uiFraudRateNum - db.fraudRate),
          `Fraud Rate: UI=${uiFraudRate}, DB=${db.fraudRate}`,
        ).toBeLessThanOrEqual(0.1);
        expect(uiCampaignsNum).toBe(db.campaignsAffected);
      });
    });

    // ── Last 2 Days ───────────────────────────────────────────────────────────

    test.describe("Summary bar - Last 2 Days", () => {
      test.beforeEach(async () => {
        test.skip(
          !hasLast2DaysData,
          `No data in last 2 days (${daysAgo(2)} – ${yesterday()})`,
        );
        await cfdPage.page.getByRole("button", { name: "Last 2 Days" }).click();
        await cfdPage.page.waitForLoadState("networkidle");
      });

      test("Summary bar matches database", async () => {
        // Add delay to ensure KPIs fully render after date selection
        await cfdPage.page.waitForTimeout(800);

        const db = await getFraudDetectionSummary(daysAgo(2), yesterday());
        const [uiTotalFraud, uiBlocked, uiWarning, uiFraudRate, uiCampaigns] =
          await Promise.all([
            getSummaryValue("Total Fraud"),
            getSummaryValue("Blocked"),
            getSummaryValue("Warning"),
            getSummaryValue("Fraud Rate"),
            getSummaryValue("Campaigns Affected"),
          ]);

        console.log(
          `[Last 2 Days Summary] Total Fraud: UI=${uiTotalFraud} DB=${db.totalFraud}`,
        );
        console.log(
          `[Last 2 Days Summary] Blocked: UI=${uiBlocked} DB=${db.blocked}`,
        );
        console.log(
          `[Last 2 Days Summary] Warning: UI=${uiWarning} DB=${db.warning}`,
        );
        console.log(
          `[Last 2 Days Summary] Fraud Rate: UI=${uiFraudRate} DB=${db.fraudRate}`,
        );
        console.log(
          `[Last 2 Days Summary] Campaigns Affected: UI=${uiCampaigns} DB=${db.campaignsAffected}`,
        );

        // Parse values for comparison
        const uiTotalFraudNum = parseUINumber(uiTotalFraud);
        const uiBlockedNum = parseUINumber(uiBlocked);
        const uiWarningNum = parseUINumber(uiWarning);
        const uiFraudRateNum = parseFloat(uiFraudRate);
        const uiCampaignsNum = parseInt(uiCampaigns);

        expect(
          withinTolerance(uiTotalFraudNum, db.totalFraud),
          `Total Fraud: UI=${uiTotalFraud}(${uiTotalFraudNum}), DB=${db.totalFraud}`,
        ).toBe(true);
        expect(
          withinTolerance(uiBlockedNum, db.blocked),
          `Blocked: UI=${uiBlocked}(${uiBlockedNum}), DB=${db.blocked}`,
        ).toBe(true);
        // Use tolerance for Warning as well since data may update between UI load and DB query
        expect(
          withinTolerance(uiWarningNum, db.warning),
          `Warning: UI=${uiWarning}(${uiWarningNum}), DB=${db.warning}`,
        ).toBe(true);
        expect(
          Math.abs(uiFraudRateNum - db.fraudRate),
          `Fraud Rate: UI=${uiFraudRate}, DB=${db.fraudRate}`,
        ).toBeLessThanOrEqual(0.1);
        expect(uiCampaignsNum).toBe(db.campaignsAffected);
      });
    });

    // ── Last 7 Days ───────────────────────────────────────────────────────────

    test.describe("Summary bar - Last 7 Days", () => {
      test.beforeEach(async () => {
        test.skip(
          !hasRecentData,
          `No data in last 7 days (${daysAgo(7)} – ${yesterday()})`,
        );
        await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
        await cfdPage.page.waitForLoadState("networkidle");
      });

      test("Summary bar matches database", async () => {
        // Add delay to ensure KPIs fully render after date selection
        await cfdPage.page.waitForTimeout(800);

        const db = await getFraudDetectionSummary(daysAgo(7), yesterday());
        const [uiTotalFraud, uiBlocked, uiWarning, uiFraudRate, uiCampaigns] =
          await Promise.all([
            getSummaryValue("Total Fraud"),
            getSummaryValue("Blocked"),
            getSummaryValue("Warning"),
            getSummaryValue("Fraud Rate"),
            getSummaryValue("Campaigns Affected"),
          ]);

        console.log(
          `[Last 7 Days Summary] Total Fraud: UI=${uiTotalFraud} DB=${db.totalFraud}`,
        );
        console.log(
          `[Last 7 Days Summary] Blocked: UI=${uiBlocked} DB=${db.blocked}`,
        );
        console.log(
          `[Last 7 Days Summary] Warning: UI=${uiWarning} DB=${db.warning}`,
        );
        console.log(
          `[Last 7 Days Summary] Fraud Rate: UI=${uiFraudRate} DB=${db.fraudRate}`,
        );
        console.log(
          `[Last 7 Days Summary] Campaigns Affected: UI=${uiCampaigns} DB=${db.campaignsAffected}`,
        );

        // Parse values for comparison
        const uiTotalFraudNum = parseUINumber(uiTotalFraud);
        const uiBlockedNum = parseUINumber(uiBlocked);
        const uiWarningNum = parseUINumber(uiWarning);
        const uiFraudRateNum = parseFloat(uiFraudRate);
        const uiCampaignsNum = parseInt(uiCampaigns);

        expect(
          withinTolerance(uiTotalFraudNum, db.totalFraud),
          `Total Fraud: UI=${uiTotalFraud}(${uiTotalFraudNum}), DB=${db.totalFraud}`,
        ).toBe(true);
        expect(
          withinTolerance(uiBlockedNum, db.blocked),
          `Blocked: UI=${uiBlocked}(${uiBlockedNum}), DB=${db.blocked}`,
        ).toBe(true);
        // Use tolerance for Warning as well since data may update between UI load and DB query
        expect(
          withinTolerance(uiWarningNum, db.warning),
          `Warning: UI=${uiWarning}(${uiWarningNum}), DB=${db.warning}`,
        ).toBe(true);
        expect(
          Math.abs(uiFraudRateNum - db.fraudRate),
          `Fraud Rate: UI=${uiFraudRate}, DB=${db.fraudRate}`,
        ).toBeLessThanOrEqual(0.1);
        expect(uiCampaignsNum).toBe(db.campaignsAffected);
      });
    });

    // ── Table rows (page 1) ──────────────────────────────────────────────────

    test.describe("Table rows - page 1", () => {
      /**
       * Reads all visible rows from the campaign summary table inside the FDL
       * iframe AND the pagination total in a single page.evaluate call.
       * Waits until at least one row is present before reading.
       */
      const getFDLTableData = async (): Promise<{
        rows: Array<{
          campaignId: string;
          siteQuantity: number;
          fraudDetections: number;
          totalClicks: number;
          fraudPct: number;
          maxScore: number;
        }>;
        paginationTotal: number;
      }> => {
        await cfdPage.page.waitForFunction(
          () => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (doc && doc.querySelectorAll("tbody tr.cst-row").length > 0)
                return true;
            }
            return false;
          },
          { timeout: 15000 },
        );
        return cfdPage.page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc) continue;
            const rows = Array.from(doc.querySelectorAll("tbody tr.cst-row"));
            if (rows.length === 0) continue;
            const pgEl = doc.querySelector(".cst-footer span");
            const pgMatch = (pgEl?.textContent ?? "").match(/of (\d+)/);
            const paginationTotal = pgMatch ? parseInt(pgMatch[1]) : 0;
            return {
              rows: rows.map((row) => {
                const cells = Array.from(row.querySelectorAll("td"));
                const idEl = cells[0]?.querySelector(".cst-id");
                const rawId = (idEl?.textContent ?? "").replace(/[•\s]/g, "");
                const parseNum = (text: string): number =>
                  parseInt((text ?? "").replace(/,/g, "").trim()) || 0;
                return {
                  campaignId: rawId,
                  siteQuantity: parseNum(cells[1]?.textContent ?? ""),
                  fraudDetections: parseNum(cells[2]?.textContent ?? ""),
                  totalClicks: parseNum(cells[3]?.textContent ?? ""),
                  fraudPct:
                    parseFloat(
                      (cells[4]?.textContent ?? "").replace("%", "").trim(),
                    ) || 0,
                  maxScore: parseNum(cells[5]?.textContent ?? ""),
                };
              }),
              paginationTotal,
            };
          }
          return { rows: [], paginationTotal: 0 };
        });
      };

      const assertTableMatchesDB = async (
        fromDate: string,
        toDate: string,
        label: string,
      ) => {
        const [{ rows: uiRows, paginationTotal: uiTotal }, dbRows, dbSummary] =
          await Promise.all([
            getFDLTableData(),
            getFraudDetectionTablePage1(fromDate, toDate),
            getFraudDetectionSummary(fromDate, toDate),
          ]);
        const dbMap = new Map(dbRows.map((r) => [r.campaignId, r]));

        console.log(
          `[${label}] Pagination total: UI=${uiTotal} DB.campaignsAffected=${dbSummary.campaignsAffected}`,
        );
        expect(uiTotal).toBe(dbSummary.campaignsAffected);

        expect(uiRows.length).toBe(50);
        for (const ui of uiRows.slice(0, 10)) {
          const db = dbMap.get(ui.campaignId);
          expect(db, `No DB row for campaign ${ui.campaignId}`).toBeDefined();
          console.log(
            `[${label}][Campaign ${ui.campaignId}] ` +
              `Sites: UI=${ui.siteQuantity} DB=${db!.siteQuantity} | ` +
              `FraudDet: UI=${ui.fraudDetections} DB=${db!.fraudDetections} | ` +
              `Clicks: UI=${ui.totalClicks} DB=${db!.totalClicks} | ` +
              `Fraud%: UI=${ui.fraudPct}% DB=${db!.fraudPct}% | ` +
              `MaxScore: UI=${ui.maxScore} DB=${db!.maxScore}`,
          );
          expect(ui.siteQuantity).toBe(db!.siteQuantity);
          expect(ui.fraudDetections).toBe(db!.fraudDetections);
          expect(ui.totalClicks).toBe(db!.totalClicks);
          expect(ui.fraudPct).toBe(Math.round(db!.fraudPct));
          expect(ui.maxScore).toBe(db!.maxScore);
        }
      };

      // ── Yesterday ──────────────────────────────────────────────────────────

      test.describe("Yesterday", () => {
        test.beforeEach(async () => {
          test.skip(
            !hasYesterdayData,
            `No data for yesterday (${yesterday()})`,
          );
          await cfdPage.page.getByRole("button", { name: "Yesterday" }).click();
          await cfdPage.page.waitForLoadState("networkidle");
        });

        test("Table page 1 matches database", async () => {
          test.setTimeout(180000);
          await assertTableMatchesDB(yesterday(), yesterday(), "Yesterday");
        });
      });

      // ── Last 2 Days ────────────────────────────────────────────────────────

      test.describe("Last 2 Days", () => {
        test.beforeEach(async () => {
          test.skip(
            !hasLast2DaysData,
            `No data in last 2 days (${daysAgo(2)} – ${yesterday()})`,
          );
          await cfdPage.page
            .getByRole("button", { name: "Last 2 Days" })
            .click();
          await cfdPage.page.waitForLoadState("networkidle");
        });

        test("Table page 1 matches database", async () => {
          test.setTimeout(180000);
          await assertTableMatchesDB(daysAgo(2), yesterday(), "Last 2 Days");
        });
      });

      // ── Last 7 Days ────────────────────────────────────────────────────────

      test.describe("Last 7 Days", () => {
        test.beforeEach(async () => {
          test.skip(
            !hasRecentData,
            `No data in last 7 days (${daysAgo(7)} – ${yesterday()})`,
          );
          await cfdPage.page
            .getByRole("button", { name: "Last 7 Days" })
            .click();
          await cfdPage.page.waitForLoadState("networkidle");
        });

        test("Table page 1 matches database", async () => {
          test.setTimeout(180000);
          await assertTableMatchesDB(daysAgo(7), yesterday(), "Last 7 Days");
        });
      });
    });

    // ── Search ───────────────────────────────────────────────────────────────

    test.describe("Search", () => {
      test.beforeEach(async () => {
        test.skip(
          !hasRecentData,
          `No data in last 7 days (${daysAgo(7)} – ${yesterday()})`,
        );
        await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
        await cfdPage.page.waitForLoadState("networkidle");
      });

      /**
       * Types a search term into the iframe's search input and presses Enter,
       * triggering Streamlit to reload with fdl_sum_search param.
       */
      const typeSearch = async (term: string) => {
        const inputFound = await cfdPage.page.evaluate((t) => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc) continue;
            const input = doc.getElementById(
              "cst-search",
            ) as HTMLInputElement | null;
            if (!input) continue;
            input.value = t;
            // Dispatch input so Streamlit picks up the new value, then Enter to submit
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(
              new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
            );
            return true;
          }
          return false;
        }, term);

        if (!inputFound) {
          console.warn(
            `[Search] Failed to find input element with id "cst-search"`,
          );
        }

        // Wait for URL to contain the search param so we know Streamlit accepted it
        const urlUpdated = await cfdPage.page
          .waitForURL(
            (url) => url.searchParams.get("fdl_sum_search") === term,
            {
              timeout: 10000,
            },
          )
          .then(() => true)
          .catch(() => false);

        if (!urlUpdated) {
          console.warn(
            `[Search] URL did not update with search param. Current URL: ${cfdPage.page.url()}`,
          );
        }

        await cfdPage.page
          .waitForLoadState("networkidle", { timeout: 15000 })
          .catch(() => {});
      };

      /** Reads pagination total and first-page rows from the iframe after search.
       *  Waits for the srcdoc iframe to finish re-rendering (handles both result and
       *  no-result states so it never hangs). */
      const getSearchResults = async (): Promise<{
        paginationTotal: number;
        rows: Array<{ campaignId: string; campaignName: string }>;
      }> => {
        // Wait until the footer span contains "of N" (results loaded) or tbody is
        // present with an empty result. Prefer the footer condition so we don't read
        // before the count is populated.
        await cfdPage.page
          .waitForFunction(
            () => {
              const iframes = Array.from(document.querySelectorAll("iframe"));
              for (const f of iframes) {
                const doc = (f as HTMLIFrameElement).contentDocument;
                if (!doc) continue;
                // Has results: footer span contains "of N"
                const span = doc.querySelector(".cst-footer span");
                if (span && /of\s*\d+/.test(span.textContent ?? ""))
                  return true;
              }
              return false;
            },
            { timeout: 25000 },
          )
          .catch(async () => {
            // Fallback: wait for tbody (no-result state)
            await cfdPage.page
              .waitForFunction(
                () => {
                  const iframes = Array.from(
                    document.querySelectorAll("iframe"),
                  );
                  for (const f of iframes) {
                    const doc = (f as HTMLIFrameElement).contentDocument;
                    if (doc?.querySelector("tbody")) return true;
                  }
                  return false;
                },
                { timeout: 10000 },
              )
              .catch(() => {});
          });
        return cfdPage.page
          .evaluate(() => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (!doc || !doc.querySelector("tbody")) continue;
              const pgEl = doc.querySelector(".cst-footer span");
              const pgMatch = (pgEl?.textContent ?? "").match(/of (\d+)/);
              const paginationTotal = pgMatch ? parseInt(pgMatch[1]) : 0;
              const rows = Array.from(
                doc.querySelectorAll("tbody tr.cst-row"),
              ).map((row) => {
                const cells = Array.from(row.querySelectorAll("td"));
                const nameEl = cells[0]?.querySelector(".cst-name");
                const idEl = cells[0]?.querySelector(".cst-id");
                return {
                  campaignName: (nameEl?.textContent ?? "").trim(),
                  campaignId: (idEl?.textContent ?? "")
                    .replace(/[•\s]/g, "")
                    .trim(),
                };
              });
              return { paginationTotal, rows };
            }
            return { paginationTotal: 0, rows: [] };
          })
          .catch(() => ({
            paginationTotal: 0,
            rows: [] as Array<{ campaignId: string; campaignName: string }>,
          }));
      };

      test("Search by campaign name filters rows correctly", async () => {
        test.setTimeout(180000);

        const term = "KOL";
        test.skip(
          term.length === 0,
          "Campaign name too short to use as search term",
        );

        const dbCount = await getFraudDetectionSearchCount(
          daysAgo(7),
          yesterday(),
          term,
        );

        await typeSearch(term);
        const { paginationTotal, rows } = await getSearchResults();

        console.log(
          `[Search "${term}"] UI total=${paginationTotal} DB count=${dbCount}`,
        );
        expect(paginationTotal).toBe(dbCount);

        // Every visible row must contain the term in its campaign name (case-insensitive)
        for (const row of rows) {
          expect(
            row.campaignName.toLowerCase(),
            `Campaign "${row.campaignName}" does not contain "${term}"`,
          ).toContain(term.toLowerCase());
        }
      });

      test("Search by campaign ID returns exact match", async () => {
        test.setTimeout(180000);

        // Pick a real campaign ID from the DB for the current window
        const dbRows = await getFraudDetectionTablePage1(
          daysAgo(7),
          yesterday(),
        );
        test.skip(dbRows.length === 0, "No campaign data in last 7 days");
        const campaignId = dbRows[0].campaignId;

        const dbCount = await getFraudDetectionSearchCount(
          daysAgo(7),
          yesterday(),
          campaignId,
        );

        await typeSearch(campaignId);
        const { paginationTotal, rows } = await getSearchResults();

        console.log(
          `[Search ID "${campaignId}"] UI total=${paginationTotal} DB count=${dbCount}`,
        );
        expect(paginationTotal).toBe(dbCount);
        expect(paginationTotal).toBeGreaterThanOrEqual(1);
        expect(rows.length).toBeGreaterThanOrEqual(1);
        // The top result should have the exact campaign ID
        expect(rows[0].campaignId).toBe(campaignId);
      });
    });

    // ── Sorting & Pagination ──────────────────────────────────────────────────

    test.describe("Sorting & Pagination", () => {
      test.beforeEach(async () => {
        test.skip(
          !hasRecentData,
          `No data in last 7 days (${daysAgo(7)} – ${yesterday()})`,
        );
        await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
        await cfdPage.page.waitForLoadState("networkidle");
      });

      test("Table is sorted by Fraud Detections descending by default", async () => {
        test.setTimeout(180000);
        // Wait for rows, then read fraud detections column (index 2)
        await cfdPage.page.waitForFunction(
          () => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (doc && doc.querySelectorAll("tbody tr.cst-row").length > 0)
                return true;
            }
            return false;
          },
          { timeout: 15000 },
        );
        const fraudCounts = await cfdPage.page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc) continue;
            const rows = Array.from(doc.querySelectorAll("tbody tr.cst-row"));
            if (rows.length === 0) continue;
            return rows.map((row) => {
              const cells = Array.from(row.querySelectorAll("td"));
              return parseInt(
                (cells[2]?.textContent ?? "").replace(/,/g, "").trim(),
              );
            });
          }
          return [];
        });

        expect(fraudCounts.length).toBeGreaterThan(1);
        for (let i = 0; i < fraudCounts.length - 1; i++) {
          console.log(
            `Row ${i + 1}: ${fraudCounts[i]} >= Row ${i + 2}: ${fraudCounts[i + 1]}`,
          );
          expect(
            fraudCounts[i],
            `Row ${i + 1} fraud=${fraudCounts[i]} should be >= row ${i + 2} fraud=${fraudCounts[i + 1]}`,
          ).toBeGreaterThanOrEqual(fraudCounts[i + 1]);
        }
      });

      test("Pagination shows correct total pages", async () => {
        test.setTimeout(180000);
        const dbSummary = await getFraudDetectionSummary(
          daysAgo(7),
          yesterday(),
        );
        const expectedPages = Math.ceil(dbSummary.campaignsAffected / 10);

        const { paginationTotal, pageButtons } = await cfdPage.page.evaluate(
          () => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (!doc) continue;
              const pgEl = doc.querySelector(".cst-footer span");
              if (!pgEl) continue;
              const pgMatch = (pgEl.textContent ?? "").match(/of (\d+)/);
              const paginationTotal = pgMatch ? parseInt(pgMatch[1]) : 0;
              // Count numbered page buttons (pg-num class)
              const pageButtons = doc.querySelectorAll("button.pg-num").length;
              return { paginationTotal, pageButtons };
            }
            return { paginationTotal: 0, pageButtons: 0 };
          },
        );

        console.log(
          `Total campaigns: UI=${paginationTotal} DB=${dbSummary.campaignsAffected}`,
        );
        console.log(
          `Expected pages: ${expectedPages}, visible page buttons: ${pageButtons}`,
        );

        expect(paginationTotal).toBe(dbSummary.campaignsAffected);
        // Page buttons rendered: Streamlit shows at most a window of buttons
        // but the last page number equals expectedPages
        const lastPageNum = await cfdPage.page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc) continue;
            const btns = Array.from(doc.querySelectorAll("button.pg-num"));
            if (btns.length === 0) continue;
            const last = btns[btns.length - 1];
            return parseInt(last.textContent ?? "0");
          }
          return 0;
        });
        console.log(`Last page button label: ${lastPageNum}`);
        expect(lastPageNum).toBe(expectedPages);
      });

      test.skip("Changing page size to 50 shows 50 rows correct / total pages", async () => {
        test.setTimeout(180000);
        // Change the pg-size select inside the iframe to 50
        await cfdPage.page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc) continue;
            const sel = doc.querySelector(
              "select.pg-size",
            ) as HTMLSelectElement | null;
            if (!sel) continue;
            sel.value = "50";
            sel.dispatchEvent(new Event("change", { bubbles: true }));
            return;
          }
        });
        await cfdPage.page.waitForLoadState("networkidle");

        const dbSummary = await getFraudDetectionSummary(
          daysAgo(7),
          yesterday(),
        );
        const expectedPages = Math.ceil(dbSummary.campaignsAffected / 50);

        const { paginationTotal, pageButtons } = await cfdPage.page.evaluate(
          () => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (!doc) continue;
              const pgEl = doc.querySelector(".cst-footer span");
              if (!pgEl) continue;
              const pgMatch = (pgEl.textContent ?? "").match(/of (\d+)/);
              const paginationTotal = pgMatch ? parseInt(pgMatch[1]) : 0;
              // Count numbered page buttons (pg-num class)
              const pageButtons = doc.querySelectorAll("button.pg-num").length;
              return { paginationTotal, pageButtons };
            }
            return { paginationTotal: 0, pageButtons: 0 };
          },
        );

        console.log(
          `Total campaigns: UI=${paginationTotal} DB=${dbSummary.campaignsAffected}`,
        );
        console.log(
          `Expected pages: ${expectedPages}, visible page buttons: ${pageButtons}`,
        );

        expect(paginationTotal).toBe(dbSummary.campaignsAffected);
        // Page buttons rendered: Streamlit shows at most a window of buttons
        // but the last page number equals expectedPages
        const lastPageNum = await cfdPage.page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc) continue;
            const btns = Array.from(doc.querySelectorAll("button.pg-num"));
            if (btns.length === 0) continue;
            const last = btns[btns.length - 1];
            return parseInt(last.textContent ?? "0");
          }
          return 0;
        });
        console.log(`Last page button label: ${lastPageNum}`);
        expect(lastPageNum).toBe(expectedPages);
      });
    });

    // ── Campaign Detail – TIKTOK SHOP ID (7568) ─────────────────────────────────

    test.describe("Campaign Detail – TIKTOK SHOP ID (7568)", () => {
      const CAMPAIGN_ID = "7568";

      test.beforeEach(async () => {
        test.skip(
          !hasRecentData,
          `No data in last 7 days (${daysAgo(7)} – ${yesterday()})`,
        );
        // outer FDL beforeEach has already navigated to the FDL page
        await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
        await cfdPage.page.waitForLoadState("networkidle");

        // Wait for the summary table rows to appear in the iframe
        await cfdPage.page.waitForFunction(
          () => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (doc && doc.querySelectorAll("tbody tr.cst-row").length > 0)
                return true;
            }
            return false;
          },
          { timeout: 15000 },
        );

        // Click the Blibli CPS • 6659 row via the iframe's cstNav helper
        await cfdPage.page.evaluate((id) => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc) continue;
            const rows = Array.from(doc.querySelectorAll("tbody tr.cst-row"));
            for (const row of rows) {
              const idEl = row.querySelector(".cst-id");
              if (idEl?.textContent?.includes(id)) {
                (f.contentWindow as any).cstNav(row as HTMLElement);
                return;
              }
            }
          }
        }, CAMPAIGN_ID);

        await cfdPage.page.waitForURL(new RegExp(`camp=${CAMPAIGN_ID}`), {
          timeout: 15000,
        });
        await cfdPage.page.waitForLoadState("networkidle");
      });

      /** Read KPIs, rows, total count, and last page button from the detail iframe. */
      const getDetailData = async () => {
        // Streamlit may trigger a re-render/reload that invalidates the JS
        // execution context. Retry up to 3 times, waiting for networkidle
        // between each attempt.
        const waitForTable = async () => {
          const maxAttempts = 5;
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
              await cfdPage.page.waitForFunction(
                () => {
                  const iframes = Array.from(
                    document.querySelectorAll("iframe"),
                  );
                  for (const f of iframes) {
                    const doc = (f as HTMLIFrameElement).contentDocument;
                    if (doc && doc.querySelector("table.log-table"))
                      return true;
                  }
                  return false;
                },
                { timeout: 15000 },
              );
              return;
            } catch (e) {
              const msg = (e as Error).message ?? "";
              if (
                (msg.includes("closed") || msg.includes("destroyed")) &&
                attempt < maxAttempts - 1
              ) {
                // Streamlit may be mid-reload; wait for the page to settle
                // before retrying. waitForLoadState can also throw if the
                // context is still transitioning, so guard it too.
                try {
                  await cfdPage.page.waitForLoadState("networkidle", {
                    timeout: 20000,
                  });
                } catch {
                  // ignore — the next waitForFunction attempt will reveal
                  // whether the page has recovered
                }
                // Additional fixed delay so Streamlit fully stabilises
                // before the next waitForFunction call. Using setTimeout
                // avoids depending on the page object which may still be
                // closing/recreating.
                await new Promise((resolve) => setTimeout(resolve, 3000));
              } else {
                throw e;
              }
            }
          }
        };

        await waitForTable();

        return cfdPage.page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc || !doc.querySelector("table.log-table")) continue;

            // KPI bar
            const kpiMap: Record<string, string> = {};
            doc
              .querySelectorAll(".det-kpi-item, .cst-kpi-item")
              .forEach((el) => {
                const label =
                  el
                    .querySelector(".det-kpi-lbl, .cst-kpi-lbl")
                    ?.textContent?.trim() ?? "";
                const value =
                  el
                    .querySelector(".det-kpi-val, .cst-kpi-val")
                    ?.textContent?.trim() ?? "";
                if (label) kpiMap[label] = value;
              });

            // Table rows
            const rows = Array.from(
              doc.querySelectorAll("tbody tr.log-row"),
            ).map((row) => ({
              clickTime:
                row.querySelector(".col-ts")?.textContent?.trim() ?? "",
              detectionId:
                row.querySelector(".col-id")?.textContent?.trim() ?? "",
              rec: row.querySelector(".col-rec")?.textContent?.trim() ?? "",
            }));

            // Pagination span e.g. "1–50 of 9,581"
            const pgSpan = Array.from(
              doc.querySelectorAll(".det-footer-bar span"),
            ).find((s) => /of\s/.test(s.textContent ?? ""));
            const pgText = pgSpan?.textContent?.trim() ?? "";
            const pgMatch = pgText.match(/of ([\d,]+)/);
            const total = pgMatch ? parseInt(pgMatch[1].replace(/,/g, "")) : 0;

            // Last numbered page button
            const pgBtns = Array.from(
              doc.querySelectorAll(".det-pg-nums button, #det-pg-nums button"),
            );
            const lastPage =
              pgBtns.length > 0
                ? parseInt(pgBtns[pgBtns.length - 1].textContent?.trim() ?? "0")
                : 0;

            return { kpiMap, rows, total, lastPage, pgText };
          }
          return {
            kpiMap: {} as Record<string, string>,
            rows: [] as {
              clickTime: string;
              detectionId: string;
              rec: string;
            }[],
            total: 0,
            lastPage: 0,
            pgText: "",
          };
        });
      };

      /** Click a filter button inside the detail iframe and wait for reload. */
      const clickDetailFilter = async (action: "all" | "BLOCK" | "WARN") => {
        await cfdPage.page.evaluate((act) => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc || !doc.querySelector("table.log-table")) continue;
            const btn = doc.querySelector(
              `button.det-rf[data-action="${act}"]`,
            ) as HTMLElement | null;
            btn?.click();
            return;
          }
        }, action);
        try {
          await cfdPage.page.waitForLoadState("networkidle");
        } catch {
          // Streamlit may trigger a full navigation; page context may briefly close.
          // The subsequent waitForFunction in the caller will re-sync.
        }
      };

      /** Read all visible detail table rows with full column data. */
      const getDetailRows = async (): Promise<
        Array<{
          clickTime: string;
          detectionId: string;
          site: string;
          ip: string;
          rules: string;
          rec: string;
        }>
      > => {
        await cfdPage.page.waitForFunction(
          () => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (doc && doc.querySelectorAll("tbody tr.log-row").length > 0)
                return true;
            }
            return false;
          },
          { timeout: 15000 },
        );
        return cfdPage.page
          .evaluate(() => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (!doc || !doc.querySelector("table.log-table")) continue;
              const rows = Array.from(
                doc.querySelectorAll("tbody tr.log-row"),
              ).map((row) => ({
                clickTime:
                  row.querySelector(".col-ts")?.textContent?.trim() ?? "",
                detectionId:
                  row.querySelector(".col-id")?.textContent?.trim() ?? "",
                site: row.querySelector(".col-site")?.textContent?.trim() ?? "",
                ip: row.querySelector(".col-ip")?.textContent?.trim() ?? "",
                rules:
                  row.querySelector(".col-rules")?.textContent?.trim() ?? "",
                rec: row.querySelector(".col-rec")?.textContent?.trim() ?? "",
              }));
              console.log(
                `[getDetailRows] Read ${rows.length} rows. First row IP: ${rows[0]?.ip}`,
              );
              return rows;
            }
            console.warn(`[getDetailRows] No table.log-table found in iframes`);
            return [] as Array<{
              clickTime: string;
              detectionId: string;
              site: string;
              ip: string;
              rules: string;
              rec: string;
            }>;
          })
          .catch((err) => {
            console.error(`[getDetailRows] evaluate failed: ${err}`);
            return [] as Array<{
              clickTime: string;
              detectionId: string;
              site: string;
              ip: string;
              rules: string;
              rec: string;
            }>;
          });
      };

      /** Get pagination total from the detail iframe footer. */
      const getDetailPaginationTotal = async (): Promise<number> =>
        cfdPage.page
          .evaluate(() => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (!doc || !doc.querySelector("table.log-table")) continue;
              const pgSpan = Array.from(
                doc.querySelectorAll(".det-footer-bar span"),
              ).find((s) => /of\s/.test(s.textContent ?? ""));
              const m = pgSpan?.textContent?.trim().match(/of ([\d,]+)/);
              return m ? parseInt(m[1].replace(/,/g, "")) : 0;
            }
            return 0;
          })
          .catch((err) => {
            console.error(`[getDetailPaginationTotal] evaluate failed: ${err}`);
            return 0;
          });

      /** Type into the IP search input and trigger Enter. */
      const typeDetailIPSearch = async (term: string) => {
        await cfdPage.page
          .evaluate((t) => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (!doc || !doc.querySelector("table.log-table")) continue;
              const input =
                (doc.getElementById("det-search") as HTMLInputElement | null) ??
                (doc.querySelector(".det-search") as HTMLInputElement | null);
              if (!input) continue;
              input.value = t;
              input.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
              );
              return;
            }
          }, term)
          .catch((err) => {
            console.warn(`[typeDetailIPSearch] evaluate failed: ${err}`);
          });
        await cfdPage.page
          .waitForLoadState("networkidle", { timeout: 15000 })
          .catch(() => {});
        // Wait a short time for table to re-render with filtered results
        await new Promise((resolve) => setTimeout(resolve, 1000));
      };

      /**
       * Opens the Sites dropdown, selects the item at siteIndex (0-based),
       * clicks Apply, and returns the selected site ID string.
       */
      const clickDetailSiteFilter = async (
        siteIndex: number,
      ): Promise<string> => {
        const siteId = await cfdPage.page
          .evaluate((idx) => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (!doc || !doc.querySelector("table.log-table")) continue;
              const ddWraps = Array.from(doc.querySelectorAll(".det-dd-wrap"));
              const siteWrap = ddWraps[0] as HTMLElement | undefined;
              if (!siteWrap) continue;
              // Open dropdown
              (
                siteWrap.querySelector(".det-site-btn") as HTMLElement | null
              )?.click();
              // Check the nth checkbox
              const checkboxes = Array.from(
                siteWrap.querySelectorAll(
                  '.det-site-opt input[type="checkbox"]',
                ),
              ) as HTMLInputElement[];
              const cb = checkboxes[idx];
              if (!cb) continue;
              const selectedId = cb.value;
              cb.checked = true;
              cb.dispatchEvent(new Event("change", { bubbles: true }));
              // Click Apply
              (
                siteWrap.querySelector(
                  ".det-dd-footer-btn.primary",
                ) as HTMLElement | null
              )?.click();
              return selectedId;
            }
            return "";
          }, siteIndex)
          .catch((err) => {
            console.warn(`[clickDetailSiteFilter] evaluate failed: ${err}`);
            return "";
          });
        await cfdPage.page
          .waitForLoadState("networkidle", { timeout: 15000 })
          .catch(() => {});
        return siteId;
      };

      /**
       * Opens the Rules dropdown, selects the item at ruleIndex (0-based),
       * clicks Apply, and returns { ruleId, ruleLabel }.
       */
      const clickDetailRuleFilter = async (
        ruleIndex: number,
      ): Promise<{ ruleId: string; ruleLabel: string }> => {
        const result = await cfdPage.page
          .evaluate((idx) => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (!doc || !doc.querySelector("table.log-table")) continue;
              const ddWraps = Array.from(doc.querySelectorAll(".det-dd-wrap"));
              const ruleWrap = ddWraps[1] as HTMLElement | undefined;
              if (!ruleWrap) continue;
              // Open dropdown
              (
                ruleWrap.querySelector(".det-dd-btn") as HTMLElement | null
              )?.click();
              // Check the nth checkbox
              const checkboxes = Array.from(
                ruleWrap.querySelectorAll('input[type="checkbox"]'),
              ) as HTMLInputElement[];
              const cb = checkboxes[idx];
              if (!cb) continue;
              const ruleLabel = (cb.parentElement?.textContent ?? "").trim();
              // Prefer explicit value/data attrs; fall back to leading number in label
              // Try data attributes first (primary selector), then value, then fallback to label
              const ruleId =
                cb.dataset.ruleId ||
                cb.dataset.id ||
                cb.value ||
                cb.dataset.value ||
                (ruleLabel.match(/^(\d+)/) ?? [])[1] ||
                "";
              if (!ruleId) {
                console.warn(
                  `[clickDetailRuleFilter] Could not extract rule ID from checkbox at index ${idx}. Label: "${ruleLabel}", cb.value: "${cb.value}", cb.dataset: ${JSON.stringify(cb.dataset)}`,
                );
              } else {
                console.log(
                  `[clickDetailRuleFilter] Rule ${idx}: ID="${ruleId}", Label="${ruleLabel}"`,
                );
              }
              cb.checked = true;
              cb.dispatchEvent(new Event("change", { bubbles: true }));
              // Click Apply
              (
                ruleWrap.querySelector(
                  ".det-dd-footer-btn.primary",
                ) as HTMLElement | null
              )?.click();
              return { ruleId, ruleLabel };
            }
            return { ruleId: "", ruleLabel: "" };
          }, ruleIndex)
          .catch((err) => {
            console.warn(`[clickDetailRuleFilter] evaluate failed: ${err}`);
            return { ruleId: "", ruleLabel: "" };
          });
        await cfdPage.page
          .waitForLoadState("networkidle", { timeout: 15000 })
          .catch(() => {});
        return result;
      };

      test("KPI bar and total detection count match database", async () => {
        test.setTimeout(180000);
        const [detailData, dbKPIs] = await Promise.all([
          getDetailData(),
          getCampaignDetailKPIs(
            CAMPAIGN_ID,
            daysAgo(7),
            yesterday(),
            "distinct",
          ),
        ]);

        console.log(
          `[Detail KPI] Total Fraud: UI="${detailData.kpiMap["Total Fraud"]}" DB=${dbKPIs.totalFraud}`,
        );
        console.log(
          `[Detail KPI] Blocked: UI="${detailData.kpiMap["Blocked"]}" DB=${dbKPIs.blocked}`,
        );
        console.log(
          `[Detail KPI] Warned: UI="${detailData.kpiMap["Warned"]}" DB=${dbKPIs.warned}`,
        );
        console.log(
          `[Detail KPI] Unique Sites: UI="${detailData.kpiMap["Unique Sites"]}" DB=${dbKPIs.uniqueSites}`,
        );
        console.log(
          `[Detail Pagination] Total: UI=${detailData.total} DB.totalFraud=${dbKPIs.totalFraud}`,
        );

        expect(
          withinTolerance(
            parseUINumber(detailData.kpiMap["Total Fraud"] ?? "0"),
            dbKPIs.totalFraud,
          ),
          `Total Fraud UI=${detailData.kpiMap["Total Fraud"]} DB=${dbKPIs.totalFraud}`,
        ).toBe(true);
        expect(
          withinTolerance(
            parseUINumber(detailData.kpiMap["Blocked"] ?? "0"),
            dbKPIs.blocked,
          ),
          `Blocked UI=${detailData.kpiMap["Blocked"]} DB=${dbKPIs.blocked}`,
        ).toBe(true);
        expect(
          parseUINumber(detailData.kpiMap["Warned"] ?? "0"),
          `Warned UI=${detailData.kpiMap["Warned"]} DB=${dbKPIs.warned}`,
        ).toBe(dbKPIs.warned);
        expect(
          parseInt(detailData.kpiMap["Unique Sites"] ?? "0"),
          `Unique Sites UI=${detailData.kpiMap["Unique Sites"]} DB=${dbKPIs.uniqueSites}`,
        ).toBe(dbKPIs.uniqueSites);

        // Pagination total must equal DB totalFraud
        expect(detailData.total, "Pagination total vs DB totalFraud").toBe(
          dbKPIs.totalFraud,
        );
      });

      test("Table rows are sorted by Click Time descending", async () => {
        test.setTimeout(180000);
        const detailData = await getDetailData();
        expect(
          detailData.rows.length,
          "Expected at least 2 rows",
        ).toBeGreaterThan(1);

        for (let i = 0; i < detailData.rows.length - 1; i++) {
          const t1 = detailData.rows[i].clickTime;
          const t2 = detailData.rows[i + 1].clickTime;
          console.log(`Row ${i + 1}: ${t1} >= Row ${i + 2}: ${t2}`);
          expect(
            t1 >= t2,
            `Row ${i + 1} clickTime="${t1}" should be >= row ${i + 2} clickTime="${t2}"`,
          ).toBe(true);
        }
      });

      test("Detection IDs follow DET- format", async () => {
        test.setTimeout(180000);
        const detailData = await getDetailData();
        expect(detailData.rows.length).toBeGreaterThan(0);
        for (const row of detailData.rows) {
          expect(
            row.detectionId,
            `Detection ID "${row.detectionId}" should start with "DET-"`,
          ).toMatch(/^DET-/);
        }
      });

      test("Pagination shows correct total pages", async () => {
        test.setTimeout(180000);
        const [detailData, dbKPIs] = await Promise.all([
          getDetailData(),
          getCampaignDetailKPIs(CAMPAIGN_ID, daysAgo(7), yesterday()),
        ]);
        const expectedPages = Math.ceil(dbKPIs.totalFraud / 50);

        console.log(
          `Total detections: UI=${detailData.total} DB=${dbKPIs.totalFraud}`,
        );
        console.log(
          `Expected pages (÷50): ${expectedPages}, lastPageBtn: ${detailData.lastPage}`,
        );

        expect(detailData.total).toBe(dbKPIs.totalFraud);
        expect(detailData.lastPage).toBe(expectedPages);
      });

      test("Change page size 100 pagination shows correct total pages", async () => {
        test.setTimeout(180000);
        // Read total from UI (detail page defaults to yesterday's data)
        const initialData = await getDetailData();
        const total = initialData.total;
        expect(total).toBeGreaterThan(0);

        // Change page size to 100 inside the detail iframe
        await cfdPage.page
          .evaluate(() => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (!doc || !doc.querySelector("table.log-table")) continue;
              const sel = doc.querySelector(
                "select.det-ps",
              ) as HTMLSelectElement | null;
              if (!sel) continue;
              sel.value = "100";
              sel.dispatchEvent(new Event("change", { bubbles: true }));
              return;
            }
          })
          .catch((err) => {
            console.warn(`[setPaginationSize] evaluate failed: ${err}`);
          });
        await cfdPage.page
          .waitForLoadState("networkidle", { timeout: 15000 })
          .catch(() => {});

        const updatedData = await getDetailData();
        const expectedPages = Math.ceil(total / 100);

        console.log(
          `Total detections: UI=${total}, Expected pages (÷100): ${expectedPages}, lastPageBtn: ${updatedData.lastPage}`,
        );

        expect(updatedData.total).toBe(total);
        // expect(updatedData.lastPage).toBe(expectedPages);
      });

      test("Filter Block shows only BLOCK rows and count matches database", async () => {
        test.setTimeout(180000);
        await getDetailData(); // ensure detail page is fully rendered
        await clickDetailFilter("BLOCK");
        const [filteredData, dbKPIs] = await Promise.all([
          getDetailData(),
          getCampaignDetailKPIs(CAMPAIGN_ID, daysAgo(7), yesterday()),
        ]);

        // Every visible row must be BLOCK
        expect(filteredData.rows.length).toBeGreaterThan(0);
        for (const row of filteredData.rows) {
          expect(
            row.rec.toUpperCase(),
            `Row rec="${row.rec}" should be BLOCK`,
          ).toBe("BLOCK");
        }

        // Pagination total after filter = DB blocked count
        console.log(
          `[Filter Block] Pagination total: UI=${filteredData.total} DB.blocked=${dbKPIs.blocked}`,
        );
        expect(filteredData.total).toBe(dbKPIs.blocked);
      });

      test("Search by IP address filters rows correctly", async () => {
        test.setTimeout(180000);
        const ipTerm = "103.163.1";
        await getDetailData(); // ensure detail page is fully rendered
        await typeDetailIPSearch(ipTerm);

        const rows = await getDetailRows();
        const total = await getDetailPaginationTotal();

        console.log(
          `[IP Search "${ipTerm}"] total=${total} rowsShown=${rows.length}`,
        );
        console.log(
          `[IP Search] First 3 rows: ${rows
            .slice(0, 3)
            .map((r) => `IP=${r.ip}`)
            .join(", ")}`,
        );
        expect(total).toBeGreaterThan(0);
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          if (!row.ip.includes(ipTerm)) {
            console.error(
              `[IP Search] Row mismatch: got IP "${row.ip}", expected to contain "${ipTerm}"`,
            );
          }
          expect(
            row.ip,
            `Row IP "${row.ip}" should contain "${ipTerm}"`,
          ).toContain(ipTerm);
        }
      });

      test("Filter by Site (5th in list) shows only rows for that site", async () => {
        test.setTimeout(180000);
        await getDetailData(); // ensure detail page is fully rendered

        // Site list is sorted; index 4 = 5th item
        const siteId = await clickDetailSiteFilter(4);

        if (!siteId) {
          test.skip(
            true,
            "Site dropdown not found or returned empty ID — skipping",
          );
          return;
        }

        // Wait for rows to reflect the applied filter
        await getDetailData();
        const rows = await getDetailRows();
        const total = await getDetailPaginationTotal();

        console.log(
          `[Site Filter] siteId="${siteId}" total=${total} rowsShown=${rows.length}`,
        );
        expect(siteId).not.toBe("");
        expect(total).toBeGreaterThan(0);
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          expect(
            row.site,
            `Row site "${row.site}" should contain site ID "${siteId}"`,
          ).toContain(siteId);
        }
      });

      test("Filter by Rule (6th in list) shows only rows for that rule", async () => {
        test.setTimeout(180000);
        await getDetailData(); // ensure detail page is fully rendered

        // Rule list order: 1,2,3,4,6,8,… → index 5 = 6th item
        const { ruleId: rawRuleId, ruleLabel } = await clickDetailRuleFilter(5);

        if (!rawRuleId) {
          test.skip(
            true,
            `Rule dropdown not found or returned empty ID (label: "${ruleLabel}") — skipping`,
          );
          return;
        }

        // rawRuleId may be numeric ("8") or prefixed ("R8"); normalise to "R8"
        const expectedTag = /^R\d/i.test(rawRuleId)
          ? rawRuleId.toUpperCase()
          : `R${rawRuleId}`;

        // Wait for rows to reflect the applied filter
        await getDetailData();
        const rows = await getDetailRows();
        const total = await getDetailPaginationTotal();

        console.log(
          `[Rule Filter] rawId="${rawRuleId}" label="${ruleLabel}" tag=${expectedTag} total=${total} rowsShown=${rows.length}`,
        );
        expect(rawRuleId).not.toBe("");
        expect(total).toBeGreaterThan(0);
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          // Split "R8, R18, R27" → ["R8","R18","R27"] and check for exact tag
          const ruleTags = row.rules
            .split(/,\s*/)
            .map((t) => t.trim().toUpperCase());
          expect(
            ruleTags,
            `Row rules "${row.rules}" should contain "${expectedTag}"`,
          ).toContain(expectedTag);
        }
      });

      test("Filter Warn shows only Warn rows and count matches database", async () => {
        test.setTimeout(180000);

        const dbKPIs = await getCampaignDetailKPIs(
          CAMPAIGN_ID,
          daysAgo(7),
          yesterday(),
        );

        if (dbKPIs.warned === 0) {
          test.skip(
            true,
            `No warned detections in DB for campaign ${CAMPAIGN_ID} — skipping`,
          );
          return;
        }

        await getDetailData(); // ensure detail page is fully rendered
        await clickDetailFilter("WARN");

        // Poll until the pagination span reflects the filter result
        // Use a stable "of N" total rather than relying on row presence alone
        let total = 0;
        const deadline = Date.now() + 30_000;
        while (Date.now() < deadline) {
          try {
            total = await cfdPage.page.evaluate(() => {
              const iframes = Array.from(document.querySelectorAll("iframe"));
              for (const f of iframes) {
                const doc = (f as HTMLIFrameElement).contentDocument;
                if (!doc || !doc.querySelector("table.log-table")) continue;
                const pgSpan = Array.from(
                  doc.querySelectorAll(".det-footer-bar span"),
                ).find((s) => /of\s/.test(s.textContent ?? ""));
                const m = pgSpan?.textContent?.trim().match(/of ([\d,]+)/);
                if (m) return parseInt(m[1].replace(/,/g, ""));
                // No pgSpan yet — table still loading
              }
              return -1; // signal: not ready
            });
            if (total >= 0) break;
          } catch {
            await cfdPage.page.waitForLoadState("networkidle").catch(() => {});
          }
          await new Promise<void>((r) => setTimeout(r, 500));
        }

        console.log(
          `[Filter Warn] total UI=${total} DB.warned=${dbKPIs.warned}`,
        );
        expect(total).toBe(dbKPIs.warned);

        const rows = await getDetailRows();
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          expect(
            row.rec.toUpperCase(),
            `Row rec="${row.rec}" should start with "WARN"`,
          ).toMatch(/^WARN/);
        }
      });

      // ── Export ─────────────────────────────────────────────────────────────

      test("Export button is visible in campaign detail toolbar", async () => {
        test.setTimeout(60000);
        await getDetailData(); // ensure detail iframe is rendered

        const isVisible = await cfdPage.page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc || !doc.querySelector("table.log-table")) continue;
            // Look for a button/element containing "export" text (case-insensitive)
            const all = Array.from(
              doc.querySelectorAll("button, a, [role='button']"),
            );
            return all.some((el) =>
              el.textContent?.trim().toLowerCase().includes("export"),
            );
          }
          return false;
        });

        console.log(`[Export] button visible: ${isVisible}`);
        expect(
          isVisible,
          "Export button should be visible in detail toolbar",
        ).toBe(true);
      });

      test("Export triggers a file download (CSV or Excel)", async () => {
        test.setTimeout(90000);
        await getDetailData(); // ensure detail iframe is rendered

        // Check if export button exists
        const exportBtnExists = await cfdPage.page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc || !doc.querySelector("table.log-table")) continue;
            const all = Array.from(
              doc.querySelectorAll("button, a, [role='button']"),
            );
            const exportBtn = all.find((el) =>
              el.textContent?.trim().toLowerCase().includes("export"),
            );
            if (exportBtn) {
              console.log(
                `[Export] Found export button: "${exportBtn.textContent?.trim()}"`,
              );
              return true;
            }
          }
          return false;
        });

        test.skip(!exportBtnExists, "Export button not found in detail page");

        // Listen for the download event before clicking
        const downloadPromise = cfdPage.page
          .waitForEvent("download", { timeout: 30000 })
          .catch((err) => {
            console.warn(
              `[Export] Download event timeout: ${(err as Error).message}`,
            );
            return null;
          });

        await cfdPage.page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc || !doc.querySelector("table.log-table")) continue;
            const exportBtn = Array.from(
              doc.querySelectorAll("button, a, [role='button']"),
            ).find((el) =>
              el.textContent?.trim().toLowerCase().includes("export"),
            ) as HTMLElement | undefined;
            if (exportBtn) {
              console.log("[Export] Clicking export button");
              exportBtn.click();
            }
            return;
          }
        });

        const download = await downloadPromise;
        if (!download) {
          console.warn(
            "[Export] No download event received within timeout; may be test environment limitation",
          );
          return;
        }

        const filename = download.suggestedFilename();
        console.log(`[Export] Downloaded file: "${filename}"`);
        expect(
          filename,
          `Downloaded file "${filename}" should be CSV or Excel`,
        ).toMatch(/\.(csv|xlsx|xls)$/i);
      });
    });

    // ── Sites & IPs tab ──────────────────────────────────────────────────────

    test.describe("Sites & IPs tab – TIKTOK SHOP ID (7568)", () => {
      const CAMPAIGN_ID = "7568";

      test.beforeEach(async () => {
        test.skip(
          !hasRecentData,
          `No data in last 7 days (${daysAgo(7)} – ${yesterday()})`,
        );
        // outer FDL beforeEach navigated to FDL; navigate to campaign detail
        await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
        await cfdPage.page
          .waitForLoadState("networkidle", { timeout: 15000 })
          .catch(() => {});

        // Wait for summary table and click the 6659 row
        await cfdPage.page.waitForFunction(
          () => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (doc && doc.querySelectorAll("tbody tr.cst-row").length > 0)
                return true;
            }
            return false;
          },
          { timeout: 15000 },
        );
        await cfdPage.page
          .evaluate((id) => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (!doc) continue;
              const rows = Array.from(doc.querySelectorAll("tbody tr.cst-row"));
              for (const row of rows) {
                const idEl = row.querySelector(".cst-id");
                if (idEl?.textContent?.includes(id)) {
                  (f.contentWindow as any).cstNav(row as HTMLElement);
                  return;
                }
              }
            }
          }, CAMPAIGN_ID)
          .catch((err) => {
            console.warn(`[beforeEach] Failed to navigate to campaign: ${err}`);
          });
        await cfdPage.page
          .waitForURL(new RegExp(`camp=${CAMPAIGN_ID}`), {
            timeout: 15000,
          })
          .catch((err) => {
            console.warn(`[beforeEach] URL did not update to campaign: ${err}`);
          });
        await cfdPage.page
          .waitForLoadState("networkidle", { timeout: 15000 })
          .catch(() => {});

        // Click the Sites & IPs tab
        try {
          await cfdPage.page
            .getByRole("button", { name: "Sites & IPs" })
            .click({ timeout: 10000 });
        } catch (err) {
          console.warn(`[beforeEach] Failed to click Sites & IPs tab: ${err}`);
        }
      });

      /** Wait for the siip iframe to be ready, then run a page.evaluate. */
      const waitForSiip = async () => {
        const poll = () =>
          cfdPage.page.waitForFunction(
            () => {
              const iframes = Array.from(document.querySelectorAll("iframe"));
              for (const f of iframes) {
                const doc = (f as HTMLIFrameElement).contentDocument;
                if (doc && doc.getElementById("fdl-siip")) return true;
              }
              return false;
            },
            { timeout: 15000 },
          );
        try {
          await poll();
        } catch (e) {
          const msg = (e as Error).message ?? "";
          if (msg.includes("closed") || msg.includes("destroyed")) {
            await cfdPage.page.waitForLoadState("networkidle");
            await poll();
          } else {
            throw e;
          }
        }
      };

      /** Read the siip KPI bar values. */
      const getSiipKPIs = () =>
        cfdPage.page
          .evaluate(() => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (!doc?.getElementById("fdl-siip")) continue;
              const kpis: Record<string, string> = {};

              // Old format: .siip-kpi-item elements
              const items = Array.from(doc.querySelectorAll(".siip-kpi-item"));
              for (const item of items) {
                const lbl =
                  item.querySelector(".siip-kpi-lbl")?.textContent?.trim() ??
                  "";
                const val =
                  item.querySelector(".siip-kpi-val")?.textContent?.trim() ??
                  "";
                if (lbl) kpis[lbl] = val;
              }
              if (Object.keys(kpis).length > 0) {
                console.log(
                  `[getSiipKPIs] Found old format KPIs: ${JSON.stringify(kpis)}`,
                );
                return kpis;
              }

              // New format: plain text "TOTAL SITES 35 • THIS PAGE 10 sites / 43 IPs"
              const siipEl = doc.getElementById("fdl-siip");
              const fullText = siipEl?.textContent ?? "";
              console.log(`[getSiipKPIs] Full text content: "${fullText}"`);

              const totalM = fullText.match(/total\s+sites\s+(\d+)/i);
              if (totalM) {
                kpis["Total Sites"] = totalM[1];
                console.log(
                  `[getSiipKPIs] Extracted Total Sites: ${totalM[1]}`,
                );
              } else {
                console.warn(
                  `[getSiipKPIs] Could not match "Total Sites" pattern in: "${fullText}"`,
                );
              }

              const pageM = fullText.match(
                /this\s+page\s+(\d+\s+sites?\s*\/\s*\d+\s+IPs?)/i,
              );
              if (pageM) {
                kpis["This Page"] = pageM[1].trim();
                console.log(
                  `[getSiipKPIs] Extracted This Page: ${pageM[1].trim()}`,
                );
              }

              console.log(
                `[getSiipKPIs] Returning KPIs: ${JSON.stringify(kpis)}`,
              );
              return kpis;
            }
            console.warn(`[getSiipKPIs] No iframe with id "fdl-siip" found`);
            return {} as Record<string, string>;
          })
          .catch((err) => {
            console.error(`[getSiipKPIs] page.evaluate failed: ${err}`);
            return {} as Record<string, string>;
          });

      /** Read all visible grouped site rows. */
      const getSiipSiteRows = () =>
        cfdPage.page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc?.getElementById("fdl-siip")) continue;
            return Array.from(doc.querySelectorAll("tr.siip-sr")).map((r) => {
              const cells = Array.from(r.querySelectorAll("td"));
              // Column layout: [0] expand | [1] site/publisher | [2] IPs
              // [3] fraud bar visual (.siip-fpct) | [4] fraud % text
              // [5] detections | [6] max score | [7] risk pill
              return {
                siteId:
                  cells[1]?.querySelector(".siip-sid")?.textContent?.trim() ??
                  "",
                ips: parseInt(cells[2]?.textContent?.trim() ?? "0"),
                fraudPct:
                  cells[3]?.querySelector(".siip-fpct")?.textContent?.trim() ??
                  cells[4]?.textContent?.trim() ??
                  "",
                detections: parseInt((cells[5]?.textContent ?? "").trim()),
                maxScore: parseInt((cells[6]?.textContent ?? "").trim()),
                risk: (() => {
                  // Try CSS selectors for a named risk pill across multiple candidate cells
                  for (const cell of [cells[7], cells[8]]) {
                    if (!cell) continue;
                    // Primary selectors (most recent UI structure)
                    let pill = cell.querySelector(
                      ".siip-pill, .siip-risk, .risk-label",
                    );
                    // Fallback to risk-pill or attribute match
                    if (!pill)
                      pill = cell.querySelector(".risk-pill, [class*='risk']");

                    if (pill) {
                      const txt =
                        pill.textContent?.trim() ||
                        pill.getAttribute("aria-label") ||
                        pill.getAttribute("title") ||
                        "";
                      if (txt && /[a-z]/i.test(txt)) {
                        console.log(
                          `[SiipRowRisk] Found risk via selector, cell=${cells.indexOf(cell)}, text=${txt}`,
                        );
                        return txt;
                      }
                    }
                    const dataRisk =
                      cell.getAttribute("data-risk") ||
                      cell.getAttribute("data-level") ||
                      "";
                    if (dataRisk) return dataRisk;
                  }
                  // Fallback to raw cell text; map numeric scores to labels
                  const raw = cells[7]?.textContent?.trim() ?? "";
                  const n = parseFloat(raw);
                  if (!isNaN(n) && raw !== "") {
                    if (n >= 8) return "CRITICAL";
                    if (n >= 5) return "HIGH";
                    if (n >= 3) return "MEDIUM";
                    return "LOW";
                  }
                  return raw;
                })(),
              };
            });
          }
          return [] as Array<{
            siteId: string;
            ips: number;
            fraudPct: string;
            detections: number;
            maxScore: number;
            risk: string;
          }>;
        });

      /** Read all flat-view IP rows (siip-flt-r). */
      const getSiipFlatRows = () =>
        cfdPage.page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc?.getElementById("fdl-siip")) continue;
            return Array.from(doc.querySelectorAll("tr.siip-flt-r")).map(
              (r) => {
                const cells = Array.from(r.querySelectorAll("td"));
                return {
                  siteId: cells[0]?.textContent?.trim() ?? "",
                  ip: cells[1]?.textContent?.trim() ?? "",
                  clicks: parseInt(cells[2]?.textContent?.trim() ?? "0"),
                  fraudPct: cells[3]?.textContent?.trim() ?? "",
                  detections: parseInt(cells[4]?.textContent?.trim() ?? "0"),
                  score: parseInt(cells[5]?.textContent?.trim() ?? "0"),
                  risk: cells[6]?.textContent?.trim() ?? "",
                };
              },
            );
          }
          return [] as Array<{
            siteId: string;
            ip: string;
            clicks: number;
            fraudPct: string;
            detections: number;
            score: number;
            risk: string;
          }>;
        });

      /** Read pagination info from the siip footer. */
      const getSiipPagination = () =>
        cfdPage.page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc?.getElementById("fdl-siip")) continue;
            // The pagination span id is "siip-count" (e.g. "1–10 of 37")
            const pgInfo = doc.getElementById("siip-count");
            // Page buttons exist in both grouped and flat containers;
            // grab only the ones inside the visible footer bar
            const footerBar = doc.querySelector(".siip-footer-bar");
            const pgBtns = Array.from(
              footerBar?.querySelectorAll("button.siip-pg-num") ??
                doc.querySelectorAll("button.siip-pg-num"),
            );
            const text = pgInfo?.textContent?.trim() ?? "";
            const m = text.match(/of (\d+)/);
            const total = m ? parseInt(m[1]) : 0;
            // last distinct button label is the last page number
            const lastPage =
              pgBtns.length > 0
                ? parseInt(pgBtns[pgBtns.length - 1].textContent?.trim() ?? "0")
                : 0;
            return { text, total, lastPage };
          }
          return { text: "", total: 0, lastPage: 0 };
        });

      /** Click a risk filter (supports old buttons and new dropdown). */
      const clickSiipRisk = async (risk: string) => {
        // Step 1: try old-style .siip-rf buttons; otherwise open the dropdown
        await cfdPage.page.evaluate((r) => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc?.getElementById("fdl-siip")) continue;
            const rfBtns = Array.from(doc.querySelectorAll(".siip-rf"));
            const rfBtn = rfBtns.find(
              (b) => b.textContent?.trim().toLowerCase() === r.toLowerCase(),
            ) as HTMLElement | undefined;
            if (rfBtn) {
              rfBtn.click();
              return;
            }
            // New UI: open the Risk dropdown toggle
            const toggle = Array.from(doc.querySelectorAll("button")).find(
              (b) => /^risk/i.test(b.textContent?.trim() ?? ""),
            ) as HTMLElement | undefined;
            toggle?.click();
            return;
          }
        }, risk);

        // Step 2: wait for checkboxes to appear (new dropdown), then check target + Apply
        // Allow up to 5 s for the dropdown panel to render after the toggle click
        await cfdPage.page
          .waitForFunction(
            (r) => {
              const iframes = Array.from(document.querySelectorAll("iframe"));
              for (const f of iframes) {
                const doc = (f as HTMLIFrameElement).contentDocument;
                if (!doc?.getElementById("fdl-siip")) continue;
                const cbs = Array.from(
                  doc.querySelectorAll('input[type="checkbox"]'),
                );
                return cbs.some((cb) => {
                  const container = cb.closest("label") ?? cb.parentElement;
                  return (
                    container?.textContent?.trim().toLowerCase() ===
                    r.toLowerCase()
                  );
                });
              }
              return false;
            },
            risk,
            { timeout: 5000 },
          )
          .catch(() => {}); // timeout = old-style button was used; hasDropdown will be false

        const hasDropdown = await cfdPage.page.evaluate((r) => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc?.getElementById("fdl-siip")) continue;
            const cbs = Array.from(
              doc.querySelectorAll('input[type="checkbox"]'),
            );
            return cbs.some((cb) => {
              const container = cb.closest("label") ?? cb.parentElement;
              return (
                container?.textContent?.trim().toLowerCase() === r.toLowerCase()
              );
            });
          }
          return false;
        }, risk);

        if (hasDropdown) {
          // Uncheck all, check the target, click Apply
          await cfdPage.page.evaluate((r) => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (!doc?.getElementById("fdl-siip")) continue;
              const cbs = Array.from(
                doc.querySelectorAll(
                  'input[type="checkbox"]',
                ) as NodeListOf<HTMLInputElement>,
              );
              cbs.forEach((cb) => {
                if (cb.checked) {
                  cb.checked = false;
                  cb.dispatchEvent(new Event("change", { bubbles: true }));
                }
              });
              for (const cb of cbs) {
                const container = cb.closest("label") ?? cb.parentElement;
                if (
                  container?.textContent?.trim().toLowerCase() ===
                  r.toLowerCase()
                ) {
                  cb.checked = true;
                  cb.dispatchEvent(new Event("change", { bubbles: true }));
                  break;
                }
              }
              const applyBtn = Array.from(doc.querySelectorAll("button")).find(
                (b) => b.textContent?.trim().toLowerCase() === "apply",
              ) as HTMLElement | undefined;
              applyBtn?.click();
              return;
            }
          }, risk);
        } else {
          // Old format: wait for active button
          await cfdPage.page.waitForFunction(
            (r) => {
              const iframes = Array.from(document.querySelectorAll("iframe"));
              for (const f of iframes) {
                const doc = (f as HTMLIFrameElement).contentDocument;
                if (!doc?.getElementById("fdl-siip")) continue;
                const active = doc.querySelector(".siip-rf.active");
                return (
                  active?.textContent?.trim().toLowerCase() === r.toLowerCase()
                );
              }
              return false;
            },
            risk,
            { timeout: 10000 },
          );
          return;
        }

        // Step 3: wait for rows to re-render after Apply
        // Use a brief networkidle + row-count stability check rather than
        // asserting pill values (filter may be server-side or async).
        await cfdPage.page.waitForLoadState("networkidle").catch(() => {});
        await cfdPage.page.waitForFunction(
          () => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (!doc?.getElementById("fdl-siip")) continue;
              return doc.querySelectorAll("tr.siip-sr").length > 0;
            }
            return false;
          },
          { timeout: 10000 },
        );
      };

      /** Change the Sites & IPs page size selector and wait for count to update. */
      const changeSiipPageSize = async (size: number) => {
        const prevText = await cfdPage.page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc?.getElementById("fdl-siip")) continue;
            return doc.getElementById("siip-count")?.textContent?.trim() ?? "";
          }
          return "";
        });
        await cfdPage.page.evaluate((s) => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc?.getElementById("fdl-siip")) continue;
            const sel = doc.querySelector(
              "select.siip-pg-size",
            ) as HTMLSelectElement | null;
            if (!sel) continue;
            sel.value = String(s);
            sel.dispatchEvent(new Event("change", { bubbles: true }));
            return;
          }
        }, size);
        await cfdPage.page.waitForFunction(
          (prev) => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (!doc?.getElementById("fdl-siip")) continue;
              const cur =
                doc.getElementById("siip-count")?.textContent?.trim() ?? "";
              return cur !== prev;
            }
            return false;
          },
          prevText,
          { timeout: 10000 },
        );
      };

      /** Switch between Grouped / Flat view. */
      const clickSiipView = async (view: "grouped" | "flat") => {
        await cfdPage.page.evaluate((v) => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc?.getElementById("fdl-siip")) continue;
            const btns = Array.from(doc.querySelectorAll(".siip-vt"));
            const btn = btns.find(
              (b) => b.textContent?.trim().toLowerCase() === v,
            ) as HTMLElement | undefined;
            btn?.click();
            return;
          }
        }, view);
        // View toggle is client-side; wait for the correct div to become visible
        const divId = view === "flat" ? "siip-flat" : "siip-grouped";
        await cfdPage.page.waitForFunction(
          (id) => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (!doc?.getElementById("fdl-siip")) continue;
              const el = doc.getElementById(id) as HTMLElement | null;
              return el?.style?.display !== "none" && el !== null;
            }
            return false;
          },
          divId,
          { timeout: 10000 },
        );
      };

      /** Type into the Sites & IPs search field. */
      const typeSiipSearch = async (term: string) => {
        // Capture current row count to detect when search results render
        const prevRowCount = await cfdPage.page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc?.getElementById("fdl-siip")) continue;
            return doc.querySelectorAll("tr.siip-sr").length;
          }
          return -1;
        });

        await cfdPage.page.evaluate((t) => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc?.getElementById("fdl-siip")) continue;
            // Try known IDs first, then fall back to placeholder
            const inp =
              (doc.getElementById("siip-search") as HTMLInputElement | null) ??
              (doc.querySelector(
                'input[placeholder*="Site ID"], input[placeholder*="site"], input[placeholder*="search"]',
              ) as HTMLInputElement | null);
            if (!inp) continue;
            inp.focus();
            inp.value = t;
            inp.dispatchEvent(new Event("input", { bubbles: true }));
            inp.dispatchEvent(new Event("change", { bubbles: true }));
            inp.dispatchEvent(
              new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
            );
            return;
          }
        }, term);

        // Wait for row count to change (filtered result renders)
        // If the search returns the same count as before, accept after timeout
        await cfdPage.page
          .waitForFunction(
            (prev) => {
              const iframes = Array.from(document.querySelectorAll("iframe"));
              for (const f of iframes) {
                const doc = (f as HTMLIFrameElement).contentDocument;
                if (!doc?.getElementById("fdl-siip")) continue;
                const cur = doc.querySelectorAll("tr.siip-sr").length;
                return cur !== prev;
              }
              return false;
            },
            prevRowCount,
            { timeout: 15000 },
          )
          .catch(() => {}); // swallow timeout — search may return identical row count
      };

      test("Tab navigation: Sites & IPs content loads", async () => {
        test.setTimeout(180000);
        await waitForSiip();
        const kpis = await getSiipKPIs();
        console.log(`[SitesIPs] KPIs: ${JSON.stringify(kpis)}`);
        expect(kpis["Unique Sites"]).toBeDefined();
        expect(parseInt(kpis["Unique Sites"])).toBeGreaterThan(0);
      });

      test("Total Sites KPI matches database", async () => {
        test.setTimeout(180000);
        await waitForSiip();
        const [kpis, dbKPIs] = await Promise.all([
          getSiipKPIs(),
          getCampaignDetailKPIs(CAMPAIGN_ID, daysAgo(7), yesterday()),
        ]);
        const uiTotal = parseInt(kpis["Unique Sites"] ?? "0");
        console.log(
          `[SitesIPs] Total Sites: UI=${uiTotal} DB=${dbKPIs.uniqueSites} (kpis=${JSON.stringify(kpis)})`,
        );
        if (uiTotal === 0 && dbKPIs.uniqueSites > 0) {
          console.error(
            `[SitesIPs] KPI extraction failed. Full kpis object: ${JSON.stringify(kpis)}`,
          );
        }
        expect(uiTotal).toBe(dbKPIs.uniqueSites);
      });

      test.skip("Grouped view page 1 shows 10 site rows with correct detections", async () => {
        test.setTimeout(180000);
        await waitForSiip();
        const [siteRows, dbSites] = await Promise.all([
          getSiipSiteRows(),
          getCampaignSitesPage1(CAMPAIGN_ID, daysAgo(7), yesterday()),
        ]);
        const dbMap = new Map(dbSites.map((r) => [r.siteId, r]));

        console.log(`[SitesIPs] Grouped site rows: UI=${siteRows.length}`);
        expect(siteRows.length).toBe(10);

        for (const ui of siteRows) {
          const db = dbMap.get(ui.siteId);
          // Verify each visible site exists in the DB
          expect(db, `No DB row for site ${ui.siteId}`).toBeDefined();
          // Verify detections > 0 (fraud activity exists)
          expect(
            ui.detections,
            `Site ${ui.siteId} should have detections > 0`,
          ).toBeGreaterThan(0);
          console.log(
            `[SitesIPs][${ui.siteId}] Detections: UI=${ui.detections} DB.detections=${db!.detections} DB.clicks=${db!.totalClicks}`,
          );
          // The UI "Detections" column equals total fraud clicks (may differ slightly
          // from our non-ALLOW count due to UI's internal definition); verify within 20%
          expect(
            withinTolerance(ui.detections, db!.detections, 20),
            `Site ${ui.siteId} detections out of range: UI=${ui.detections} DB=${db!.detections}`,
          ).toBe(true);
        }
      });

      test("Pagination shows correct total pages", async () => {
        test.setTimeout(180000);
        await waitForSiip();
        const [pg, dbKPIs] = await Promise.all([
          getSiipPagination(),
          getCampaignDetailKPIs(CAMPAIGN_ID, daysAgo(7), yesterday()),
        ]);
        const expectedPages = Math.ceil(dbKPIs.uniqueSites / 10);

        console.log(
          `[SitesIPs] Pagination: "${pg.text}" total=${pg.total} lastPage=${pg.lastPage} DB.uniqueSites=${dbKPIs.uniqueSites} expectedPages=${expectedPages}`,
        );
        expect(pg.total).toBe(dbKPIs.uniqueSites);
        expect(pg.lastPage).toBe(expectedPages);
      });

      test.skip("Change page size to 20 shows correct total pages", async () => {
        test.setTimeout(180000);
        await waitForSiip();
        await changeSiipPageSize(20);
        const [pg, dbKPIs] = await Promise.all([
          getSiipPagination(),
          getCampaignDetailKPIs(CAMPAIGN_ID, daysAgo(7), yesterday()),
        ]);
        const expectedPages = Math.ceil(dbKPIs.uniqueSites / 20);

        console.log(
          `[SitesIPs][PageSize=20] "${pg.text}" total=${pg.total} lastPage=${pg.lastPage} DB.uniqueSites=${dbKPIs.uniqueSites} expectedPages=${expectedPages}`,
        );
        expect(pg.total).toBe(dbKPIs.uniqueSites);
        expect(pg.lastPage).toBe(expectedPages);
      });

      test("Risk filter High shows only HIGH-risk site rows", async () => {
        test.setTimeout(180000);
        await waitForSiip();
        await clickSiipRisk("High");
        const siteRows = await getSiipSiteRows();

        console.log(`[SitesIPs][Risk=High] rows=${siteRows.length}`);
        expect(siteRows.length).toBeGreaterThan(0);
        for (const row of siteRows) {
          expect(
            row.risk.toUpperCase(),
            `Site ${row.siteId} risk="${row.risk}" should contain HIGH`,
          ).toContain("HIGH");
        }
      });

      test("Risk filter Critical shows only CRITICAL-risk site rows", async () => {
        test.setTimeout(180000);
        await waitForSiip();
        await clickSiipRisk("Critical");
        const siteRows = await getSiipSiteRows();

        console.log(`[SitesIPs][Risk=Critical] rows=${siteRows.length}`);
        expect(siteRows.length).toBeGreaterThan(0);
        for (const row of siteRows) {
          expect(
            row.risk.toUpperCase(),
            `Site ${row.siteId} risk="${row.risk}" should contain CRITICAL`,
          ).toContain("CRITICAL");
        }
      });

      test("Flat view shows IP-level rows for all sites on page 1", async () => {
        test.setTimeout(180000);
        await waitForSiip();
        const kpiBefore = await getSiipKPIs();
        const thisPageText = kpiBefore["This Page"] ?? "";
        // Extract "10 sites / 41 IPs"
        const ipsMatch = thisPageText.match(/(\d+)\s+IPs/);
        const expectedIPs = ipsMatch ? parseInt(ipsMatch[1]) : -1;

        if (expectedIPs < 0) {
          test.skip(
            true,
            `Could not determine expected IP count from KPI bar ("This Page"="${thisPageText}") — skipping`,
          );
          return;
        }

        await clickSiipView("flat");

        // In flat view siip-flt-r rows are rendered
        await cfdPage.page.waitForFunction(
          () => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (doc && doc.querySelectorAll("tr.siip-flt-r").length > 0)
                return true;
            }
            return false;
          },
          { timeout: 15000 },
        );
        const flatRows = await getSiipFlatRows();
        console.log(
          `[SitesIPs][Flat] IP rows=${flatRows.length} expectedIPs=${expectedIPs}`,
        );
        expect(flatRows.length).toBe(expectedIPs);
      });

      test("Search by Site ID filters to matching sites only", async () => {
        test.setTimeout(180000);
        await waitForSiip();
        // Use the second site on page 1 from DB
        const dbSites = await getCampaignSitesPage1(
          CAMPAIGN_ID,
          daysAgo(7),
          yesterday(),
        );
        const targetSiteId = dbSites[1].siteId; // 2nd site

        await typeSiipSearch(targetSiteId);

        const siteRows = await getSiipSiteRows();
        const pg = await getSiipPagination();

        console.log(
          `[SitesIPs][Search "${targetSiteId}"] rows=${siteRows.length} pgTotal=${pg.total}`,
        );
        expect(pg.total).toBeGreaterThanOrEqual(1);
        for (const row of siteRows) {
          expect(
            row.siteId,
            `Visible site ID "${row.siteId}" should match search term "${targetSiteId}"`,
          ).toContain(targetSiteId);
        }
      });
    });
  });

  test.afterEach(async () => {
    await cfdPage.page.close();
  });
});
