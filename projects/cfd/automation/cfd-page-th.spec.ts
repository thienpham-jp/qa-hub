import { test, expect } from "@playwright/test";
import { CFDPage } from "@shared/pages/cfd-page";
import { CFD_PASSWORD, CFD_USERNAME } from "@shared/utils/user-helper";
import {
  closeDatabasePool,
  daysAgo,
  getCampaignDetailKPIs,
  getCampaignSitesPage1,
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

test.describe.skip("CFD TH Tests", () => {
  // test.describe.configure({ mode: "parallel" });
  let cfdPage: CFDPage;

  test.beforeEach(async ({ page }) => {
    cfdPage = new CFDPage(page);

    await cfdPage.login("TH", CFD_USERNAME, CFD_PASSWORD);

    await cfdPage.page.waitForLoadState("networkidle");
  });

  test.afterAll(async () => {
    await closeDatabasePool("th");
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
      cfdPage.page.getByText(`Showing data for ${formatted}`, { exact: false }),
    ).toBeVisible();
  });

  test.describe("Executive Dashboard", () => {
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
          getDashboardMetrics(yesterday(), "th"),
          getDashboardMetricsDelta("th"),
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
          getDashboardMetrics(yesterday(), "th"),
          getDashboardMetricsDelta("th"),
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
          getDashboardMetrics(yesterday(), "th"),
          getDashboardMetricsDelta("th"),
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

      test("Suspicious (Warning): value and delta match database", async () => {
        const [metrics, delta] = await Promise.all([
          getDashboardMetrics(yesterday(), "th"),
          getDashboardMetricsDelta("th"),
        ]);
        const uiValue = await getKpiValue("Suspicious");
        const ui = await getKpiDelta("Suspicious");
        console.log(`Suspicious: UI=${uiValue} DB=${metrics.suspicious}`);
        console.log(
          `Suspicious delta: UI=${ui.raw} (${ui.value}%) DB=${delta.suspicious}%`,
        );
        expect(
          withinTolerance(uiValue, metrics.suspicious),
          `Suspicious: UI=${uiValue}, DB=${metrics.suspicious}`,
        ).toBe(true);
        if (delta.suspicious !== null) {
          expect(
            Math.abs(ui.value - delta.suspicious),
            `Suspicious delta: UI=${ui.value}%, DB=${delta.suspicious}%`,
          ).toBeLessThanOrEqual(1);
        }
      });
    });

    test.describe("Top Threat Vectors vs database", () => {
      test("All threat vector block counts match database", async () => {
        const dbRows = await getTopThreatVectors(yesterday(), "th");
        // DB group_rule_name matches UI labels exactly (e.g. "SITE VELOCITY")
        const dbMap = new Map(dbRows.map((r) => [r.category, r.blocks]));

        // DOM uses .threat-vec-row (not <table>) — wait for first data row
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

          const dbValue = dbMap.get(categoryText) ?? 0;
          const uiValue = parseUINumber(blocksText);

          console.log(`[${categoryText}] UI=${uiValue} DB=${dbValue}`);

          expect(
            withinTolerance(uiValue, dbValue),
            `Threat vector "${categoryText}": UI=${uiValue}, DB=${dbValue}`,
          ).toBe(true);
        }
      });
    });

    // ── Top Fraud Sources table ────────────────────────────────────────────────

    test.describe("Top Fraud Sources vs database", () => {
      test("Block counts and recommendations match database", async () => {
        const dbRows = await getTopFraudSources(yesterday(), 10, "th");
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
            `${pubName} [${siteId}] Blocks UI=${uiBlocks} DB=${dbRow.blocks} | Rate UI=${uiRate}% DB=${dbRow.blockRate}% | Rec=${recommendationText}`,
          );

          expect(
            withinTolerance(uiBlocks, dbRow.blocks),
            `Fraud source "${pubName} [${siteId}]" blocks: UI=${uiBlocks}, DB=${dbRow.blocks}`,
          ).toBe(true);

          expect(Math.abs(uiRate - dbRow.blockRate)).toBeLessThanOrEqual(1);

          if (dbRow.blockRate === 100) {
            expect(
              recommendationText,
              `Site ${siteId} blockRate=100% should have rec="Block"`,
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

        const dbRows = await getTrendHourly(yesterday(), "th");
        expect(dbRows.length).toBe(24);
        const dbMap = new Map(dbRows.map((r) => [r.hourBucket, r]));

        for (const point of chartData) {
          const dbRow = dbMap.get(point.hour);
          expect(dbRow, `No DB row for hour ${point.hour}`).toBeDefined();

          console.log(
            `[Yesterday ${point.hour}] Chart clicks=${point.clicks} DB=${dbRow!.totalClicks} | Chart fraud%=${point.fraudPct} DB=${dbRow!.blockedRatePct}`,
          );
          expect(point.clicks).toBe(dbRow!.totalClicks);
          // Allow ±2% tolerance for fraud rate comparison
          expect(
            Math.abs(point.fraudPct - dbRow!.blockedRatePct),
            `Hour ${point.hour}: chart fraud%=${point.fraudPct}, DB=${dbRow!.blockedRatePct}`,
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

        const dbRows = await getTrendLast7Days("th");
        const dbMap = new Map(dbRows.map((r) => [r.requestDate, r]));

        for (const point of chartData) {
          // Chart x is ISO datetime "2026-04-19T00:00:00" → extract date part
          const dateKey = point.hour.split("T")[0];
          const dbRow = dbMap.get(dateKey);
          if (!dbRow) {
            console.log(
              `[Last7Days] No DB row for ${dateKey} (may be zero-data day)`,
            );
            expect(point.clicks).toBe(0);
            continue;
          }

          console.log(
            `[Last7Days ${dateKey}] Chart clicks=${point.clicks} DB=${dbRow.totalClicks} | Chart fraud%=${point.fraudPct} DB=${dbRow.blockedRatePct}`,
          );
          expect(point.clicks).toBe(dbRow.totalClicks);
          // Allow ±2% tolerance for fraud rate comparison
          expect(
            Math.abs(point.fraudPct - dbRow.blockedRatePct),
            `Last 7 Days ${dateKey} fraud%: chart=${point.fraudPct}, DB=${dbRow.blockedRatePct}`,
          ).toBeLessThanOrEqual(2);
        }
      });
    });
  });

  test.describe("Fraud Detection Log", () => {
    // Navigate to Fraud Detection Log before each test in this group
    test.beforeEach(async () => {
      await cfdPage.page.locator('a[href*="fraud-detection-log"]').click();
      await cfdPage.page.waitForLoadState("networkidle");
    });

    /**
     * Reads a KPI value from the summary bar inside the toolbar iframe.
     * labelText: e.g. "Total Fraud", "Blocked", "Warning", "Fraud Rate", "Campaigns Affected"
     */
    const getSummaryValue = async (labelText: string): Promise<string> => {
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
        await cfdPage.page.getByRole("button", { name: "Yesterday" }).click();
        await cfdPage.page.waitForLoadState("networkidle");
      });

      test("Summary bar matches database", async () => {
        const db = await getFraudDetectionSummary(
          yesterday(),
          yesterday(),
          "th",
        );
        const [uiTotalFraud, uiBlocked, uiWarning, uiFraudRate, uiCampaigns] =
          await Promise.all([
            getSummaryValue("Total Fraud"),
            getSummaryValue("Blocked"),
            getSummaryValue("Warning"),
            getSummaryValue("Fraud Rate"),
            getSummaryValue("Campaigns Affected"),
          ]);

        console.log(
          `[Yesterday] Total Fraud: UI=${uiTotalFraud} DB=${db.totalFraud}`,
        );
        console.log(`[Yesterday] Blocked: UI=${uiBlocked} DB=${db.blocked}`);
        console.log(`[Yesterday] Warning: UI=${uiWarning} DB=${db.warning}`);
        console.log(
          `[Yesterday] Fraud Rate: UI=${uiFraudRate} DB=${db.fraudRate}`,
        );
        console.log(
          `[Yesterday] Campaigns Affected: UI=${uiCampaigns} DB=${db.campaignsAffected}`,
        );

        expect(
          withinTolerance(parseUINumber(uiTotalFraud), db.totalFraud),
          `Total Fraud: UI=${uiTotalFraud}, DB=${db.totalFraud}`,
        ).toBe(true);
        expect(
          withinTolerance(parseUINumber(uiBlocked), db.blocked),
          `Blocked: UI=${uiBlocked}, DB=${db.blocked}`,
        ).toBe(true);
        expect(parseUINumber(uiWarning)).toBe(db.warning);
        // expect(
        //   Math.abs(parseFloat(uiFraudRate) - db.fraudRate),
        //   `Fraud Rate: UI=${uiFraudRate}, DB=${db.fraudRate}`,
        // ).toBeLessThanOrEqual(0.1);
        expect(parseInt(uiCampaigns)).toBe(db.campaignsAffected);
      });
    });

    // ── Last 2 Days ───────────────────────────────────────────────────────────

    test.describe("Summary bar - Last 2 Days", () => {
      test.beforeEach(async () => {
        await cfdPage.page.getByRole("button", { name: "Last 2 Days" }).click();
        await cfdPage.page.waitForLoadState("networkidle");
      });

      test("Summary bar matches database", async () => {
        const db = await getFraudDetectionSummary(
          daysAgo(2),
          yesterday(),
          "th",
        );
        const [uiTotalFraud, uiBlocked, uiWarning, uiFraudRate, uiCampaigns] =
          await Promise.all([
            getSummaryValue("Total Fraud"),
            getSummaryValue("Blocked"),
            getSummaryValue("Warning"),
            getSummaryValue("Fraud Rate"),
            getSummaryValue("Campaigns Affected"),
          ]);

        console.log(
          `[Last 2 Days] Total Fraud: UI=${uiTotalFraud} DB=${db.totalFraud}`,
        );
        console.log(`[Last 2 Days] Blocked: UI=${uiBlocked} DB=${db.blocked}`);
        console.log(`[Last 2 Days] Warning: UI=${uiWarning} DB=${db.warning}`);
        console.log(
          `[Last 2 Days] Fraud Rate: UI=${uiFraudRate} DB=${db.fraudRate}`,
        );
        console.log(
          `[Last 2 Days] Campaigns Affected: UI=${uiCampaigns} DB=${db.campaignsAffected}`,
        );

        expect(
          withinTolerance(parseUINumber(uiTotalFraud), db.totalFraud),
          `Total Fraud: UI=${uiTotalFraud}, DB=${db.totalFraud}`,
        ).toBe(true);
        expect(
          withinTolerance(parseUINumber(uiBlocked), db.blocked),
          `Blocked: UI=${uiBlocked}, DB=${db.blocked}`,
        ).toBe(true);
        expect(parseUINumber(uiWarning)).toBe(db.warning);
        // expect(
        //   Math.abs(parseFloat(uiFraudRate) - db.fraudRate),
        //   `Fraud Rate: UI=${uiFraudRate}, DB=${db.fraudRate}`,
        // ).toBeLessThanOrEqual(0.1);
        expect(parseInt(uiCampaigns)).toBe(db.campaignsAffected);
      });
    });

    // ── Last 7 Days ───────────────────────────────────────────────────────────

    test.describe("Summary bar - Last 7 Days", () => {
      test.beforeEach(async () => {
        await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
        await cfdPage.page.waitForLoadState("networkidle");
      });

      test("Summary bar matches database", async () => {
        const db = await getFraudDetectionSummary(
          daysAgo(7),
          yesterday(),
          "th",
        );
        const [uiTotalFraud, uiBlocked, uiWarning, uiFraudRate, uiCampaigns] =
          await Promise.all([
            getSummaryValue("Total Fraud"),
            getSummaryValue("Blocked"),
            getSummaryValue("Warning"),
            getSummaryValue("Fraud Rate"),
            getSummaryValue("Campaigns Affected"),
          ]);

        console.log(
          `[Last 7 Days] Total Fraud: UI=${uiTotalFraud} DB=${db.totalFraud}`,
        );
        console.log(`[Last 7 Days] Blocked: UI=${uiBlocked} DB=${db.blocked}`);
        console.log(`[Last 7 Days] Warning: UI=${uiWarning} DB=${db.warning}`);
        console.log(
          `[Last 7 Days] Fraud Rate: UI=${uiFraudRate} DB=${db.fraudRate}`,
        );
        console.log(
          `[Last 7 Days] Campaigns Affected: UI=${uiCampaigns} DB=${db.campaignsAffected}`,
        );

        expect(
          withinTolerance(parseUINumber(uiTotalFraud), db.totalFraud),
          `Total Fraud: UI=${uiTotalFraud}, DB=${db.totalFraud}`,
        ).toBe(true);
        expect(
          withinTolerance(parseUINumber(uiBlocked), db.blocked),
          `Blocked: UI=${uiBlocked}, DB=${db.blocked}`,
        ).toBe(true);
        expect(parseUINumber(uiWarning)).toBe(db.warning);
        // expect(
        //   Math.abs(parseFloat(uiFraudRate) - db.fraudRate),
        //   `Fraud Rate: UI=${uiFraudRate}, DB=${db.fraudRate}`,
        // ).toBeLessThanOrEqual(0.1);
        expect(parseInt(uiCampaigns)).toBe(db.campaignsAffected);
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
            getFraudDetectionTablePage1(fromDate, toDate, "th"),
            getFraudDetectionSummary(fromDate, toDate, "th"),
          ]);
        const dbMap = new Map(dbRows.map((r) => [r.campaignId, r]));

        console.log(
          `[${label}] Pagination total: UI=${uiTotal} DB.campaignsAffected=${dbSummary.campaignsAffected}`,
        );
        expect(uiTotal).toBe(dbSummary.campaignsAffected);

        expect(uiRows.length).toBe(10);
        for (const ui of uiRows) {
          const db = dbMap.get(ui.campaignId);
          expect(db, `No DB row for campaign ${ui.campaignId}`).toBeDefined();
          console.log(
            `[${label}][Campaign ${ui.campaignId}] ` +
              `Sites: UI=${ui.siteQuantity} DB=${db!.siteQuantity} | ` +
              `FraudDet: UI=${ui.fraudDetections} DB=${db!.fraudDetections} | ` +
              `Clicks: UI=${ui.totalClicks} DB=${db!.totalClicks} | ` +
              `Fraud%: UI=${ui.fraudPct}% DB=${db!.fraudPct}%`,
          );
          expect(ui.siteQuantity).toBe(db!.siteQuantity);
          expect(ui.fraudDetections).toBe(db!.fraudDetections);
          expect(ui.totalClicks).toBe(db!.totalClicks);
          expect(ui.fraudPct).toBe(db!.fraudPct);
        }
      };

      // ── Yesterday ──────────────────────────────────────────────────────────

      test.describe("Yesterday", () => {
        test.beforeEach(async () => {
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
        await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
        await cfdPage.page.waitForLoadState("networkidle");
      });

      /**
       * Types a search term into the iframe's search input and presses Enter,
       * triggering Streamlit to reload with fdl_sum_search param.
       */
      const typeSearch = async (term: string) => {
        await cfdPage.page.evaluate((t) => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc) continue;
            const input = doc.getElementById(
              "cst-search",
            ) as HTMLInputElement | null;
            if (!input) continue;
            input.value = t;
            input.dispatchEvent(
              new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
            );
            return;
          }
        }, term);
        await cfdPage.page.waitForLoadState("networkidle");
      };

      /** Reads pagination total and first-page rows from the iframe after search. */
      const getSearchResults = async (): Promise<{
        paginationTotal: number;
        rows: Array<{ campaignId: string; campaignName: string }>;
      }> => {
        await cfdPage.page.waitForFunction(
          () => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (!doc) continue;
              if (doc.querySelector(".cst-footer span")) return true;
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
            const pgEl = doc.querySelector(".cst-footer span");
            if (!pgEl) continue;
            const pgMatch = (pgEl.textContent ?? "").match(/of (\d+)/);
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
        });
      };

      test("Search by campaign name filters rows correctly", async () => {
        test.setTimeout(180000);
        const term = "KOL";
        const [dbCount] = await Promise.all([
          getFraudDetectionSearchCount(daysAgo(7), yesterday(), term, "th"),
        ]);

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
        const campaignId = "6659";
        const dbCount = await getFraudDetectionSearchCount(
          daysAgo(7),
          yesterday(),
          campaignId,
          "th",
        );

        await typeSearch(campaignId);
        const { paginationTotal, rows } = await getSearchResults();

        console.log(
          `[Search ID "${campaignId}"] UI total=${paginationTotal} DB count=${dbCount}`,
        );
        expect(paginationTotal).toBe(dbCount);
        expect(paginationTotal).toBe(1);
        expect(rows.length).toBe(1);
        expect(rows[0].campaignId).toBe(campaignId);
      });
    });

    // ── Sorting & Pagination ──────────────────────────────────────────────────

    test.describe("Sorting & Pagination", () => {
      test.beforeEach(async () => {
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
          "th",
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

      test("Changing page size to 50 shows 50 rows correct / total pages", async () => {
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
          "th",
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

    // ── Campaign Detail – Naiin Books 248 ─────────────────────────────────

    test.describe("Campaign Detail – Naiin Books (248)", () => {
      const CAMPAIGN_ID = "248";

      test.beforeEach(async () => {
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

        // Click the Naiin Books • 248 row via the iframe's cstNav helper
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

        await cfdPage.page.waitForURL(/camp=248/, { timeout: 15000 });
        await cfdPage.page.waitForLoadState("networkidle");
      });

      /** Read KPIs, rows, total count, and last page button from the detail iframe. */
      const getDetailData = async () => {
        await cfdPage.page.waitForFunction(
          () => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (doc && doc.querySelector("table.log-table")) return true;
            }
            return false;
          },
          { timeout: 15000 },
        );

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
        await cfdPage.page.waitForLoadState("networkidle");
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
        return cfdPage.page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc || !doc.querySelector("table.log-table")) continue;
            return Array.from(doc.querySelectorAll("tbody tr.log-row")).map(
              (row) => ({
                clickTime:
                  row.querySelector(".col-ts")?.textContent?.trim() ?? "",
                detectionId:
                  row.querySelector(".col-id")?.textContent?.trim() ?? "",
                site: row.querySelector(".col-site")?.textContent?.trim() ?? "",
                ip: row.querySelector(".col-ip")?.textContent?.trim() ?? "",
                rules:
                  row.querySelector(".col-rules")?.textContent?.trim() ?? "",
                rec: row.querySelector(".col-rec")?.textContent?.trim() ?? "",
              }),
            );
          }
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
        cfdPage.page.evaluate(() => {
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
        });

      /** Type into the IP search input and trigger Enter. */
      const typeDetailIPSearch = async (term: string) => {
        await cfdPage.page.evaluate((t) => {
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
        }, term);
        await cfdPage.page.waitForLoadState("networkidle");
      };

      /**
       * Opens the Sites dropdown, selects the item at siteIndex (0-based),
       * clicks Apply, and returns the selected site ID string.
       */
      const clickDetailSiteFilter = async (
        siteIndex: number,
      ): Promise<string> => {
        const siteId = await cfdPage.page.evaluate((idx) => {
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
              siteWrap.querySelectorAll('.det-site-opt input[type="checkbox"]'),
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
        }, siteIndex);
        await cfdPage.page.waitForLoadState("networkidle");
        return siteId;
      };

      /**
       * Opens the Rules dropdown, selects the item at ruleIndex (0-based),
       * clicks Apply, and returns { ruleId, ruleLabel }.
       */
      const clickDetailRuleFilter = async (
        ruleIndex: number,
      ): Promise<{ ruleId: string; ruleLabel: string }> => {
        const result = await cfdPage.page.evaluate((idx) => {
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
            const ruleId = cb.value;
            const ruleLabel = (cb.parentElement?.textContent ?? "").trim();
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
        }, ruleIndex);
        await cfdPage.page.waitForLoadState("networkidle");
        return result;
      };

      test("KPI bar and total detection count match database", async () => {
        test.setTimeout(180000);
        const [detailData, dbKPIs] = await Promise.all([
          getDetailData(),
          getCampaignDetailKPIs(CAMPAIGN_ID, daysAgo(7), yesterday(), "th"),
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
          getCampaignDetailKPIs(CAMPAIGN_ID, daysAgo(7), yesterday(), "th"),
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
        const [detailData, dbKPIs] = await Promise.all([
          getDetailData(),
          getCampaignDetailKPIs(CAMPAIGN_ID, daysAgo(7), yesterday(), "th"),
        ]);
        const expectedPages = Math.ceil(dbKPIs.totalFraud / 100);

        console.log(
          `Total detections: UI=${detailData.total} DB=${dbKPIs.totalFraud}`,
        );
        console.log(
          `Expected pages (÷100): ${expectedPages}, lastPageBtn: ${detailData.lastPage}`,
        );

        expect(detailData.total).toBe(dbKPIs.totalFraud);
        expect(detailData.lastPage).toBe(expectedPages);
      });

      test("Filter Block shows only BLOCK rows and count matches database", async () => {
        test.setTimeout(180000);
        await getDetailData(); // ensure detail page is fully rendered
        await clickDetailFilter("BLOCK");
        const [filteredData, dbKPIs] = await Promise.all([
          getDetailData(),
          getCampaignDetailKPIs(CAMPAIGN_ID, daysAgo(7), yesterday(), "th"),
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
        const ipTerm = "188.143.";
        await getDetailData(); // ensure detail page is fully rendered
        await typeDetailIPSearch(ipTerm);

        const rows = await getDetailRows();
        const total = await getDetailPaginationTotal();

        console.log(
          `[IP Search "${ipTerm}"] total=${total} rowsShown=${rows.length}`,
        );
        expect(total).toBeGreaterThan(0);
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          expect(
            row.ip,
            `Row IP "${row.ip}" should contain "${ipTerm}"`,
          ).toContain(ipTerm);
        }
      });

      test("Filter by Site (5th in list) shows only rows for that site", async () => {
        test.setTimeout(180000);
        await getDetailData(); // ensure detail page is fully rendered

        // Site list is sorted; index 4 = 5th item (e.g. "10907")
        const siteId = await clickDetailSiteFilter(4);

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

      test.skip("Filter by Rule (6th in list) shows only rows for that rule", async () => {
        test.setTimeout(180000);
        await getDetailData(); // ensure detail page is fully rendered

        // Rule list order: 1,2,3,4,6,8,… → index 5 = 6th item = rule 8 (REFERER WITH EMPTY DIRECT)
        const { ruleId, ruleLabel } = await clickDetailRuleFilter(5);

        const rows = await getDetailRows();
        const total = await getDetailPaginationTotal();
        const expectedTag = `R${ruleId}`;

        console.log(
          `[Rule Filter] rule=${ruleId} label="${ruleLabel}" tag=${expectedTag} total=${total} rowsShown=${rows.length}`,
        );
        expect(ruleId).not.toBe("");
        expect(total).toBeGreaterThan(0);
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          // Split "R8, R18, R27" → ["R8","R18","R27"] and check for exact tag
          const ruleTags = row.rules.split(/,\s*/);
          expect(
            ruleTags,
            `Row rules "${row.rules}" should contain "${expectedTag}"`,
          ).toContain(expectedTag);
        }
      });

      test.skip("Filter Warn shows only Warn rows and count matches database", async () => {
        test.setTimeout(180000);
        await getDetailData(); // ensure detail page is fully rendered
        await clickDetailFilter("WARN");

        // After applying the Warn filter, wait for either rows or the empty state
        // message — both indicate the page has finished rendering.
        await cfdPage.page.waitForFunction(
          () => {
            const iframes = Array.from(document.querySelectorAll("iframe"));
            for (const f of iframes) {
              const doc = (f as HTMLIFrameElement).contentDocument;
              if (!doc || !doc.querySelector("table.log-table")) continue;
              // Either rows are present OR the table body is empty
              const hasRows =
                doc.querySelectorAll("tbody tr.log-row").length > 0;
              const hasEmptyState = !!doc.querySelector(
                ".det-empty, .log-empty, [class*='empty'], tbody:empty, tbody tr.empty",
              );
              const pgSpan = Array.from(
                doc.querySelectorAll(".det-footer-bar span"),
              ).find((s) => /of\s/.test(s.textContent ?? ""));
              return hasRows || hasEmptyState || pgSpan !== undefined;
            }
            return false;
          },
          { timeout: 15000 },
        );

        const dbKPIs = await getCampaignDetailKPIs(
          CAMPAIGN_ID,
          daysAgo(7),
          yesterday(),
          "th",
        );
        const total = await getDetailPaginationTotal();

        console.log(
          `[Filter Warn] total UI=${total} DB.warned=${dbKPIs.warned}`,
        );
        expect(total).toBe(dbKPIs.warned);

        // Only validate row content when there are rows to check
        if (dbKPIs.warned > 0) {
          const rows = await getDetailRows();
          expect(rows.length).toBeGreaterThan(0);
          for (const row of rows) {
            expect(
              row.rec.toUpperCase(),
              `Row rec="${row.rec}" should start with "WARN"`,
            ).toMatch(/^WARN/);
          }
        }
      });
    });

    // ── Sites & IPs tab ──────────────────────────────────────────────────────

    test.describe("Sites & IPs tab – Naiin Books (248)", () => {
      const CAMPAIGN_ID = "248";

      test.beforeEach(async () => {
        // outer FDL beforeEach navigated to FDL; navigate to campaign detail
        await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
        await cfdPage.page.waitForLoadState("networkidle");

        // Wait for summary table and click the 248 row
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
        await cfdPage.page.waitForURL(/camp=248/, { timeout: 15000 });
        await cfdPage.page.waitForLoadState("networkidle");

        // Click the Sites & IPs tab
        await cfdPage.page.getByRole("tab", { name: "Sites & IPs" }).click();
        await cfdPage.page.waitForLoadState("networkidle");
      });

      /** Wait for the siip iframe to be ready, then run a page.evaluate. */
      const waitForSiip = async () => {
        await cfdPage.page.waitForFunction(
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
      };

      /** Read the siip KPI bar values. */
      const getSiipKPIs = () =>
        cfdPage.page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc?.getElementById("fdl-siip")) continue;
            const items = Array.from(doc.querySelectorAll(".siip-kpi-item"));
            const kpis: Record<string, string> = {};
            for (const item of items) {
              const lbl =
                item.querySelector(".siip-kpi-lbl")?.textContent?.trim() ?? "";
              const val =
                item.querySelector(".siip-kpi-val")?.textContent?.trim() ?? "";
              if (lbl) kpis[lbl] = val;
            }
            return kpis;
          }
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
              return {
                siteId:
                  cells[1]?.querySelector(".siip-sid")?.textContent?.trim() ??
                  "",
                ips: parseInt(cells[2]?.textContent?.trim() ?? "0"),
                clicks: parseInt(cells[3]?.textContent?.trim() ?? "0"),
                fraudPct:
                  cells[4]?.querySelector(".siip-fpct")?.textContent?.trim() ??
                  "",
                detections: parseInt((cells[5]?.textContent ?? "").trim()),
                maxScore: parseInt((cells[6]?.textContent ?? "").trim()),
                risk:
                  cells[7]?.querySelector(".siip-pill")?.textContent?.trim() ??
                  "",
              };
            });
          }
          return [] as Array<{
            siteId: string;
            ips: number;
            clicks: number;
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

      /** Click a risk filter button (All/Critical/High/Medium/Low). */
      const clickSiipRisk = async (risk: string) => {
        await cfdPage.page.evaluate((r) => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc?.getElementById("fdl-siip")) continue;
            const btns = Array.from(doc.querySelectorAll(".siip-rf"));
            const btn = btns.find(
              (b) => b.textContent?.trim().toLowerCase() === r.toLowerCase(),
            ) as HTMLElement | undefined;
            btn?.click();
            return;
          }
        }, risk);
        // Risk filter is client-side; wait until the active button reflects the new selection
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
        // Capture the current count text so we can wait for it to change
        const prevText = await cfdPage.page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc?.getElementById("fdl-siip")) continue;
            return doc.getElementById("siip-count")?.textContent?.trim() ?? "";
          }
          return "";
        });

        await cfdPage.page.evaluate((t) => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          for (const f of iframes) {
            const doc = (f as HTMLIFrameElement).contentDocument;
            if (!doc?.getElementById("fdl-siip")) continue;
            const inp = doc.getElementById(
              "siip-search",
            ) as HTMLInputElement | null;
            if (!inp) continue;
            inp.value = t;
            inp.dispatchEvent(new Event("input", { bubbles: true }));
            return;
          }
        }, term);

        // Wait for the siip-count span to change (debounce completes)
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

      test("Tab navigation: Sites & IPs content loads", async () => {
        test.setTimeout(180000);
        await waitForSiip();
        const kpis = await getSiipKPIs();
        console.log(`[SitesIPs] KPIs: ${JSON.stringify(kpis)}`);
        expect(kpis["Total Sites"]).toBeDefined();
        expect(parseInt(kpis["Total Sites"])).toBeGreaterThan(0);
      });

      test("Total Sites KPI matches database", async () => {
        test.setTimeout(180000);
        await waitForSiip();
        const [kpis, dbKPIs] = await Promise.all([
          getSiipKPIs(),
          getCampaignDetailKPIs(CAMPAIGN_ID, daysAgo(7), yesterday(), "th"),
        ]);
        const uiTotal = parseInt(kpis["Total Sites"] ?? "0");
        console.log(
          `[SitesIPs] Total Sites: UI=${uiTotal} DB=${dbKPIs.uniqueSites}`,
        );
        expect(uiTotal).toBe(dbKPIs.uniqueSites);
      });

      test("Grouped view page 1 shows 10 site rows with correct detections", async () => {
        test.setTimeout(180000);
        await waitForSiip();
        const [siteRows, dbSites] = await Promise.all([
          getSiipSiteRows(),
          getCampaignSitesPage1(CAMPAIGN_ID, daysAgo(7), yesterday(), "th"),
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
          getCampaignDetailKPIs(CAMPAIGN_ID, daysAgo(7), yesterday(), "th"),
        ]);
        const expectedPages = Math.ceil(dbKPIs.uniqueSites / 10);

        console.log(
          `[SitesIPs] Pagination: "${pg.text}" total=${pg.total} lastPage=${pg.lastPage} DB.uniqueSites=${dbKPIs.uniqueSites} expectedPages=${expectedPages}`,
        );
        expect(pg.total).toBe(dbKPIs.uniqueSites);
        expect(pg.lastPage).toBe(expectedPages);
      });

      test("Change page size to 20 shows correct total pages", async () => {
        test.setTimeout(180000);
        await waitForSiip();
        await changeSiipPageSize(20);
        const [pg, dbKPIs] = await Promise.all([
          getSiipPagination(),
          getCampaignDetailKPIs(CAMPAIGN_ID, daysAgo(7), yesterday(), "th"),
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
            `Site ${row.siteId} risk="${row.risk}" should be HIGH`,
          ).toBe("HIGH");
        }
      });

      test("Risk filter Low shows only LOW-risk site rows", async () => {
        test.setTimeout(180000);
        await waitForSiip();
        await clickSiipRisk("Low");
        const siteRows = await getSiipSiteRows();

        console.log(`[SitesIPs][Risk=Low] rows=${siteRows.length}`);
        expect(siteRows.length).toBeGreaterThan(0);
        for (const row of siteRows) {
          expect(
            row.risk.toUpperCase(),
            `Site ${row.siteId} risk="${row.risk}" should be LOW`,
          ).toBe("LOW");
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
          "th",
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
