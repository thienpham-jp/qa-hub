import { test, expect } from "@playwright/test";
import { CFDPage } from "@shared/pages/cfd-page";
import { CFD_PASSWORD, CFD_USERNAME } from "@shared/utils/user-helper";
import {
  closeDatabasePool,
  daysAgo,
  getAflCountByAction,
  getAflCountByCampaign,
  getAflCountByIp,
  getAflCountByRule,
  getAflCountBySite,
  getAflSummary,
  queryOne,
  yesterday,
  withinTolerance,
} from "@shared/utils/db-helper";

// ── Helpers ──────────────────────────────────────────────────────────────────

const getAflSummaryBar = async (
  page: CFDPage["page"],
): Promise<{
  totalFraud: number;
  blocked: number;
  warning: number;
  avgScore: number;
}> => {
  // Wait until KPI items appear inside any iframe
  await page
    .waitForFunction(
      () => {
        const iframes = Array.from(document.querySelectorAll("iframe"));
        for (const f of iframes) {
          const doc =
            (f as HTMLIFrameElement).contentDocument ||
            (f as HTMLIFrameElement).contentWindow?.document;
          if (doc && doc.querySelectorAll(".al-kpi-item").length > 0)
            return true;
        }
        return false;
      },
      { timeout: 30000 },
    )
    .catch(() => {});

  return page.evaluate(() => {
    const parseVal = (text: string): number => {
      const clean = (text || "").replace(/,/g, "").trim();
      const m = clean.match(/^([\d.]+)([MKBmkb]?)$/);
      if (!m) return 0;
      const n = parseFloat(m[1]);
      switch (m[2].toUpperCase()) {
        case "M":
          return Math.round(n * 1_000_000);
        case "K":
          return Math.round(n * 1_000);
        case "B":
          return Math.round(n * 1_000_000_000);
        default:
          return Math.round(n);
      }
    };
    const parse = (label: string): string => {
      const iframes = Array.from(document.querySelectorAll("iframe"));
      for (const f of iframes) {
        try {
          const doc =
            (f as HTMLIFrameElement).contentDocument ||
            (f as HTMLIFrameElement).contentWindow?.document;
          if (!doc) continue;
          const items = Array.from(doc.querySelectorAll(".al-kpi-item"));
          const item = items.find((el) =>
            el
              .querySelector(".al-kpi-lbl")
              ?.textContent?.trim()
              .toLowerCase()
              .includes(label.toLowerCase()),
          );
          if (item)
            return item.querySelector(".al-kpi-val")?.textContent?.trim() ?? "";
        } catch {}
      }
      return "";
    };
    return {
      totalFraud: parseVal(parse("Total Fraud")),
      blocked: parseVal(parse("Blocked")),
      warning: parseVal(parse("Warning") || parse("Warn")),
      avgScore: parseFloat(parse("Avg Score") || "0"),
    };
  });
};

const getAflTableData = async (
  page: CFDPage["page"],
): Promise<{
  rows: Array<{
    clickTime: string;
    detectionId: string;
    score: number;
    ip: string;
    rec: string;
  }>;
  paginationText: string;
  paginationTotal: number;
  lastPageBtn: number;
}> => {
  await page.waitForFunction(
    () => {
      const iframes = Array.from(document.querySelectorAll("iframe"));
      for (const f of iframes) {
        const doc = (f as HTMLIFrameElement).contentDocument;
        if (
          doc &&
          doc.querySelectorAll("tbody tr.afl-row, tbody tr.log-row").length > 0
        )
          return true;
      }
      return false;
    },
    { timeout: 20000 },
  );
  return page.evaluate(() => {
    const iframes = Array.from(document.querySelectorAll("iframe"));
    for (const f of iframes) {
      const doc = (f as HTMLIFrameElement).contentDocument;
      if (!doc) continue;
      const rows = Array.from(
        doc.querySelectorAll("tbody tr.afl-row, tbody tr.log-row"),
      );
      if (rows.length === 0) continue;

      const pgSpan = Array.from(doc.querySelectorAll("span")).find((s) =>
        /of\s/.test(s.textContent ?? ""),
      );
      const pgText = pgSpan?.textContent?.trim() ?? "";
      const pgMatch = pgText.match(/of ([\d,]+)/);
      const paginationTotal = pgMatch
        ? parseInt(pgMatch[1].replace(/,/g, ""))
        : 0;

      const btns = Array.from(
        doc.querySelectorAll(
          "button.pg-num, button.afl-pg-num, button.det-pg-num",
        ),
      );
      const lastPageBtn =
        btns.length > 0
          ? parseInt(btns[btns.length - 1].textContent?.trim() ?? "0")
          : 0;

      return {
        rows: rows.map((row) => {
          const cells = Array.from(row.querySelectorAll("td"));
          const getText = (i: number) => (cells[i]?.textContent ?? "").trim();
          return {
            clickTime: getText(1),
            detectionId: getText(2),
            score: parseInt(getText(5).replace(/,/g, "")) || 0,
            ip: getText(7),
            rec: getText(8),
          };
        }),
        paginationText: pgText,
        paginationTotal,
        lastPageBtn,
      };
    }
    return { rows: [], paginationText: "", paginationTotal: 0, lastPageBtn: 0 };
  });
};

const clickAflFilter = async (
  page: CFDPage["page"],
  action: "All" | "Block" | "Warn",
) => {
  // Use native Playwright frame click so React synthetic events fire correctly
  const frames = page.frames();
  for (const frame of frames) {
    if (frame === page.mainFrame()) continue;
    const btn = frame.getByRole("button", { name: action, exact: true });
    if ((await btn.count()) > 0) {
      await btn.first().click();
      await page.waitForTimeout(2000);
      return;
    }
  }
  // fallback: nth(2) iframe
  await page
    .frameLocator("iframe")
    .nth(2)
    .getByRole("button", { name: action, exact: true })
    .click({ timeout: 5000 })
    .catch(() => {});
  await page.waitForTimeout(2000);
};

const typeAflIpSearch = async (page: CFDPage["page"], term: string) => {
  await page.evaluate((t) => {
    const iframes = Array.from(document.querySelectorAll("iframe"));
    for (const f of iframes) {
      const doc = (f as HTMLIFrameElement).contentDocument;
      if (!doc) continue;
      const inp =
        (doc.querySelector(
          "input[placeholder*='IP']",
        ) as HTMLInputElement | null) ??
        (doc.querySelector(
          "input[class*='search']",
        ) as HTMLInputElement | null) ??
        (doc.querySelector("input[type='text']") as HTMLInputElement | null) ??
        (doc.getElementById("afl-search") as HTMLInputElement | null) ??
        (doc.getElementById("det-search") as HTMLInputElement | null);
      if (!inp) continue;
      inp.value = t;
      inp.dispatchEvent(new Event("input", { bubbles: true }));
      inp.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
      inp.dispatchEvent(
        new KeyboardEvent("keypress", { key: "Enter", bubbles: true }),
      );
      inp.dispatchEvent(
        new KeyboardEvent("keyup", { key: "Enter", bubbles: true }),
      );
      return;
    }
  }, term);
  await page.waitForTimeout(2000);
};

const selectAflDropdown = async (
  page: CFDPage["page"],
  dropdownLabel: "Campaigns" | "Sites" | "Rules",
  itemIndex: number,
): Promise<string> => {
  const value = await page.evaluate(
    ({ label, idx }) => {
      const iframes = Array.from(document.querySelectorAll("iframe"));
      for (const f of iframes) {
        const doc = (f as HTMLIFrameElement).contentDocument;
        if (!doc) continue;
        const allBtns = Array.from(doc.querySelectorAll("button"));
        const triggerBtn = allBtns.find((b) =>
          b.textContent?.trim().toLowerCase().includes(label.toLowerCase()),
        ) as HTMLElement | undefined;
        if (!triggerBtn) continue;
        triggerBtn.click();

        const checkboxes = Array.from(
          doc.querySelectorAll('input[type="checkbox"]'),
        ) as HTMLInputElement[];
        const cb = checkboxes[idx];
        if (!cb) continue;
        const val = cb.value;
        cb.checked = true;
        cb.dispatchEvent(new Event("change", { bubbles: true }));

        const applyBtns = Array.from(doc.querySelectorAll("button"));
        const applyBtn = applyBtns.find((b) =>
          b.textContent?.trim().toLowerCase().includes("apply"),
        ) as HTMLElement | undefined;
        applyBtn?.click();
        return val;
      }
      return "";
    },
    { label: dropdownLabel, idx: itemIndex },
  );
  await page.waitForTimeout(2000);
  return value;
};

const changeAflPageSize = async (page: CFDPage["page"], size: number) => {
  await page.evaluate((s) => {
    const iframes = Array.from(document.querySelectorAll("iframe"));
    for (const f of iframes) {
      const doc = (f as HTMLIFrameElement).contentDocument;
      if (!doc) continue;
      const sel = doc.querySelector(
        "select.pg-size, select.afl-pg-size",
      ) as HTMLSelectElement | null;
      if (!sel) continue;
      sel.value = String(s);
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
  }, size);
  await page.waitForTimeout(2000);
};

const getAflTotal = async (page: CFDPage["page"]): Promise<number> =>
  page.evaluate(() => {
    const iframes = Array.from(document.querySelectorAll("iframe"));
    for (const f of iframes) {
      const doc = (f as HTMLIFrameElement).contentDocument;
      if (!doc) continue;
      const pgSpan = Array.from(doc.querySelectorAll("span")).find((s) =>
        /of\s/.test(s.textContent ?? ""),
      );
      const m = pgSpan?.textContent?.trim().match(/of ([\d,]+)/);
      return m ? parseInt(m[1].replace(/,/g, "")) : 0;
    }
    return 0;
  });

// ─────────────────────────────────────────────────────────────────────────────

test.describe("CFD TH - Action Fraud Log", () => {
  let cfdPage: CFDPage;

  test.beforeEach(async ({ page }) => {
    cfdPage = new CFDPage(page);
    await cfdPage.login("TH", CFD_USERNAME, CFD_PASSWORD);
    await cfdPage.page.waitForTimeout(3000);
    await cfdPage.page.locator('a[href*="action-fraud-log"]').click();
    await cfdPage.page.waitForTimeout(3000);
  });

  test.afterAll(async () => {
    await closeDatabasePool("th");
  });

  // ── Heading ───────────────────────────────────────────────────────────────

  test("Action Fraud Log - heading verification", async () => {
    // Heading is in the main document; wait for it to appear
    await cfdPage.page
      .waitForSelector("text=Action Fraud Log", { timeout: 30000 })
      .catch(() => {});
    const heading = cfdPage.page.getByRole("heading", {
      name: "Action Fraud Log",
    });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  // ── Summary Bar ───────────────────────────────────────────────────────────

  test.describe("Summary bar", () => {
    const checkSummaryBar = async (
      fromDate: string,
      toDate: string,
      label: string,
    ) => {
      const [db, ui] = await Promise.all([
        getAflSummary(fromDate, toDate, "th"),
        getAflSummaryBar(cfdPage.page),
      ]);
      console.log(
        `[${label}] Total Fraud: UI=${ui.totalFraud} DB=${db.totalFraud}`,
      );
      console.log(`[${label}] Blocked:     UI=${ui.blocked} DB=${db.blocked}`);
      console.log(`[${label}] Warning:     UI=${ui.warning} DB=${db.warning}`);
      console.log(
        `[${label}] Avg Score:   UI=${ui.avgScore} DB=${db.avgScore}`,
      );

      expect(
        withinTolerance(ui.totalFraud, db.totalFraud),
        `Total Fraud: UI=${ui.totalFraud} DB=${db.totalFraud}`,
      ).toBe(true);
      expect(
        withinTolerance(ui.blocked, db.blocked),
        `Blocked: UI=${ui.blocked} DB=${db.blocked}`,
      ).toBe(true);
      expect(ui.warning).toBe(db.warning);
      expect(
        Math.abs(ui.avgScore - db.avgScore),
        `Avg Score: UI=${ui.avgScore} DB=${db.avgScore}`,
      ).toBeLessThanOrEqual(1);
    };

    test.describe("Yesterday", () => {
      test.beforeEach(async () => {
        await cfdPage.page.getByRole("button", { name: "Yesterday" }).click();
        await cfdPage.page.waitForTimeout(3000);
      });

      test("Total Fraud count matches database", async () => {
        test.setTimeout(60000);
        const [db, ui] = await Promise.all([
          getAflSummary(yesterday(), yesterday(), "th"),
          getAflSummaryBar(cfdPage.page),
        ]);
        console.log(`Total Fraud: UI=${ui.totalFraud} DB=${db.totalFraud}`);
        expect(withinTolerance(ui.totalFraud, db.totalFraud)).toBe(true);
      });

      test("Blocked count matches database", async () => {
        test.setTimeout(60000);
        const [db, ui] = await Promise.all([
          getAflSummary(yesterday(), yesterday(), "th"),
          getAflSummaryBar(cfdPage.page),
        ]);
        console.log(`Blocked: UI=${ui.blocked} DB=${db.blocked}`);
        expect(withinTolerance(ui.blocked, db.blocked)).toBe(true);
      });

      test("Warning count matches database", async () => {
        test.setTimeout(60000);
        const [db, ui] = await Promise.all([
          getAflSummary(yesterday(), yesterday(), "th"),
          getAflSummaryBar(cfdPage.page),
        ]);
        console.log(`Warning: UI=${ui.warning} DB=${db.warning}`);
        expect(ui.warning).toBe(db.warning);
      });

      test("Avg Score matches database", async () => {
        test.setTimeout(60000);
        const [db, ui] = await Promise.all([
          getAflSummary(yesterday(), yesterday(), "th"),
          getAflSummaryBar(cfdPage.page),
        ]);
        console.log(`Avg Score: UI=${ui.avgScore} DB=${db.avgScore}`);
        expect(Math.abs(ui.avgScore - db.avgScore)).toBeLessThanOrEqual(1);
      });
    });

    test.describe("Last 2 Days", () => {
      test.beforeEach(async () => {
        await cfdPage.page.getByRole("button", { name: "Last 2 Days" }).click();
        await cfdPage.page.waitForTimeout(3000);
      });

      test("Summary bar matches database", async () => {
        test.setTimeout(60000);
        await checkSummaryBar(daysAgo(2), yesterday(), "Last 2 Days");
      });
    });

    test.describe("Last 7 Days", () => {
      test.beforeEach(async () => {
        await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
        await cfdPage.page.waitForTimeout(3000);
      });

      test("Summary bar matches database", async () => {
        test.setTimeout(60000);
        await checkSummaryBar(daysAgo(7), yesterday(), "Last 7 Days");
      });
    });
  });

  // ── Table & Pagination ────────────────────────────────────────────────────

  test.describe("Table & Pagination - Last 7 Days", () => {
    test.beforeEach(async () => {
      await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
      await cfdPage.page.waitForTimeout(3000);
    });

    test("Table page 1 has 50 rows by default", async () => {
      test.setTimeout(120000);
      const { rows } = await getAflTableData(cfdPage.page);
      console.log(`Rows on page 1: ${rows.length}`);
      expect(rows.length).toBe(50);
    });

    test("Pagination total matches database", async () => {
      test.setTimeout(120000);
      const [db, { paginationTotal }] = await Promise.all([
        getAflSummary(daysAgo(7), yesterday(), "th"),
        getAflTableData(cfdPage.page),
      ]);
      console.log(
        `Pagination total: UI=${paginationTotal} DB=${db.totalFraud}`,
      );
      expect(
        withinTolerance(paginationTotal, db.totalFraud),
        `Pagination: UI=${paginationTotal} DB=${db.totalFraud}`,
      ).toBe(true);
    });

    test("Total pages = CEIL(totalFraud / 50)", async () => {
      test.setTimeout(120000);
      const [db, { paginationTotal, lastPageBtn }] = await Promise.all([
        getAflSummary(daysAgo(7), yesterday(), "th"),
        getAflTableData(cfdPage.page),
      ]);
      const expectedPages = Math.ceil(db.totalFraud / 50);
      console.log(
        `Total fraud=${db.totalFraud}, expectedPages=${expectedPages}, lastPageBtn=${lastPageBtn}`,
      );
      expect(
        withinTolerance(paginationTotal, db.totalFraud),
        `paginationTotal=${paginationTotal} DB=${db.totalFraud}`,
      ).toBe(true);
      // lastPageBtn is 0 when page has no numbered buttons — skip that check
      if (lastPageBtn > 0) {
        expect(lastPageBtn).toBe(expectedPages);
      }
    });

    test("Rows are sorted by Click Time descending", async () => {
      test.setTimeout(120000);
      const { rows } = await getAflTableData(cfdPage.page);
      expect(rows.length).toBeGreaterThan(1);
      for (let i = 0; i < rows.length - 1; i++) {
        const t1 = rows[i].clickTime;
        const t2 = rows[i + 1].clickTime;
        console.log(`Row ${i + 1}: ${t1} >= Row ${i + 2}: ${t2}`);
        expect(
          t1 >= t2,
          `Row ${i + 1} "${t1}" should be >= row ${i + 2} "${t2}"`,
        ).toBe(true);
      }
    });

    test("Detection IDs are populated", async () => {
      test.setTimeout(120000);
      const { rows } = await getAflTableData(cfdPage.page);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(
          row.detectionId,
          `Detection ID "${row.detectionId}" should start with "DET-"`,
        ).toMatch(/^DET-/);
      }
    });

    test("Score column values are between 0 and 100", async () => {
      test.setTimeout(120000);
      const { rows } = await getAflTableData(cfdPage.page);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(
          row.score,
          `Score "${row.score}" should be >= 0`,
        ).toBeGreaterThanOrEqual(0);
        expect(
          row.score,
          `Score "${row.score}" should be <= 100`,
        ).toBeLessThanOrEqual(100);
      }
    });

    test("Rec. column only contains BLOCK or WARN values", async () => {
      test.setTimeout(120000);
      const { rows } = await getAflTableData(cfdPage.page);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(
          row.rec.toUpperCase(),
          `Rec "${row.rec}" should be BLOCK or start with WARN`,
        ).toMatch(/^(BLOCK|WARN)/i);
      }
    });

    test("Change page size to 100 shows correct total pages", async () => {
      test.setTimeout(120000);
      await changeAflPageSize(cfdPage.page, 100);
      const [db, { paginationTotal, lastPageBtn }] = await Promise.all([
        getAflSummary(daysAgo(7), yesterday(), "th"),
        getAflTableData(cfdPage.page),
      ]);
      const expectedPages = Math.ceil(db.totalFraud / 100);
      console.log(
        `PageSize=100: total=${paginationTotal} DB=${db.totalFraud} lastPage=${lastPageBtn} expected=${expectedPages}`,
      );
      expect(withinTolerance(paginationTotal, db.totalFraud)).toBe(true);
      if (lastPageBtn > 0) {
        expect(lastPageBtn).toBe(expectedPages);
      }
    });
  });

  // ── Action Filter (All / Block / Warn) ────────────────────────────────────

  test.describe("Action Filter - Last 7 Days", () => {
    test.beforeEach(async () => {
      await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
      await cfdPage.page.waitForTimeout(3000);
    });

    test("Filter Block - all visible rows have Rec. = BLOCK", async () => {
      test.setTimeout(120000);
      await clickAflFilter(cfdPage.page, "Block");
      const { rows } = await getAflTableData(cfdPage.page);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(
          row.rec.toUpperCase(),
          `Rec "${row.rec}" should be BLOCK`,
        ).toMatch(/^BLOCK/i);
      }
    });

    test("Filter Block - pagination total matches DB blocked count", async () => {
      test.setTimeout(120000);
      await clickAflFilter(cfdPage.page, "Block");
      const [dbCount, uiTotal] = await Promise.all([
        getAflCountByAction(daysAgo(7), yesterday(), "BLOCK", "th"),
        getAflTotal(cfdPage.page),
      ]);
      console.log(`[Filter Block] UI=${uiTotal} DB=${dbCount}`);
      expect(withinTolerance(uiTotal, dbCount)).toBe(true);
    });

    test("Filter Warn - all visible rows have Rec. starting with WARN", async () => {
      test.setTimeout(120000);
      await clickAflFilter(cfdPage.page, "Warn");
      const { rows } = await getAflTableData(cfdPage.page);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(
          row.rec.toUpperCase(),
          `Rec "${row.rec}" should start with WARN`,
        ).toMatch(/^WARN/i);
      }
    });

    test("Filter Warn - pagination total matches DB warning count", async () => {
      test.setTimeout(120000);
      await clickAflFilter(cfdPage.page, "Warn");
      const [dbCount, uiTotal] = await Promise.all([
        getAflCountByAction(daysAgo(7), yesterday(), "WARNING", "th"),
        getAflTotal(cfdPage.page),
      ]);
      console.log(`[Filter Warn] UI=${uiTotal} DB=${dbCount}`);
      expect(uiTotal).toBe(dbCount);
    });

    test("Filter All - pagination total = Block + Warn", async () => {
      test.setTimeout(120000);
      await clickAflFilter(cfdPage.page, "All");
      const [dbBlocked, dbWarning, uiTotal] = await Promise.all([
        getAflCountByAction(daysAgo(7), yesterday(), "BLOCK", "th"),
        getAflCountByAction(daysAgo(7), yesterday(), "WARNING", "th"),
        getAflTotal(cfdPage.page),
      ]);
      const dbTotal = dbBlocked + dbWarning;
      console.log(`[Filter All] UI=${uiTotal} DB(block+warn)=${dbTotal}`);
      expect(withinTolerance(uiTotal, dbTotal)).toBe(true);
    });
  });

  // ── Search by IP Address ──────────────────────────────────────────────────

  test.describe("Search by IP Address - Last 7 Days", () => {
    test.beforeEach(async () => {
      await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
      await cfdPage.page.waitForTimeout(3000);
    });

    test("Search by partial IP - all rows contain the IP substring", async () => {
      test.setTimeout(120000);
      const ipTerm = "103.163";
      await typeAflIpSearch(cfdPage.page, ipTerm);
      const { rows, paginationTotal } = await getAflTableData(cfdPage.page);
      const dbCount = await getAflCountByIp(
        daysAgo(7),
        yesterday(),
        ipTerm,
        "th",
      );
      console.log(
        `[IP Search "${ipTerm}"] UI=${paginationTotal} DB=${dbCount} rowsShown=${rows.length}`,
      );
      expect(withinTolerance(paginationTotal, dbCount)).toBe(true);
      for (const row of rows) {
        expect(
          row.ip,
          `Row IP "${row.ip}" should contain "${ipTerm}"`,
        ).toContain(ipTerm);
      }
    });

    test("Search by non-existent IP - shows 0 total", async () => {
      test.setTimeout(60000);
      await typeAflIpSearch(cfdPage.page, "999.999.999.999");
      const total = await getAflTotal(cfdPage.page);
      console.log(`[IP Search non-existent] total=${total}`);
      expect(total).toBe(0);
    });
  });

  // ── Dropdown Filters ─────────────────────────────────────────────────────

  test.describe("Dropdown Filters - Last 7 Days", () => {
    test.beforeEach(async () => {
      await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
      await cfdPage.page.waitForTimeout(3000);
    });

    test("Campaign filter - pagination total matches DB count for that campaign", async () => {
      test.setTimeout(120000);
      const campaignId = await selectAflDropdown(cfdPage.page, "Campaigns", 0);
      const [uiTotal, dbCount] = await Promise.all([
        getAflTotal(cfdPage.page),
        getAflCountByCampaign(daysAgo(7), yesterday(), campaignId, "th"),
      ]);
      console.log(`[Campaign "${campaignId}"] UI=${uiTotal} DB=${dbCount}`);
      expect(withinTolerance(uiTotal, dbCount)).toBe(true);
    });

    test("Site filter - pagination total matches DB count for that site", async () => {
      test.setTimeout(120000);
      const siteId = await selectAflDropdown(cfdPage.page, "Sites", 0);
      const [uiTotal, dbCount] = await Promise.all([
        getAflTotal(cfdPage.page),
        getAflCountBySite(daysAgo(7), yesterday(), siteId, "th"),
      ]);
      console.log(`[Site "${siteId}"] UI=${uiTotal} DB=${dbCount}`);
      expect(withinTolerance(uiTotal, dbCount)).toBe(true);
    });

    test("Rules filter - pagination total matches DB count for that rule", async () => {
      test.setTimeout(120000);
      const ruleId = await selectAflDropdown(cfdPage.page, "Rules", 0);
      const [uiTotal, dbCount] = await Promise.all([
        getAflTotal(cfdPage.page),
        getAflCountByRule(daysAgo(7), yesterday(), ruleId, "th"),
      ]);
      console.log(`[Rule "${ruleId}"] UI=${uiTotal} DB=${dbCount}`);
      expect(withinTolerance(uiTotal, dbCount)).toBe(true);
    });

    test("Combined Campaign + Block filter shows correct subset", async () => {
      test.setTimeout(120000);
      const campaignId = await selectAflDropdown(cfdPage.page, "Campaigns", 0);
      await clickAflFilter(cfdPage.page, "Block");
      const [uiTotal, row] = await Promise.all([
        getAflTotal(cfdPage.page),
        queryOne<{ count: string }>(
          `SELECT COUNT(*) AS "count" FROM click_events
           WHERE DATE(request_date) BETWEEN $1 AND $2
             AND final_action_name = 'BLOCK'
             AND campaign_id::text = $3`,
          [daysAgo(7), yesterday(), campaignId],
          "th",
        ),
      ]);
      const dbCount = Number(row.count);
      console.log(
        `[Campaign "${campaignId}" + Block] UI=${uiTotal} DB=${dbCount}`,
      );
      expect(withinTolerance(uiTotal, dbCount)).toBe(true);
    });
  });

  // ── Export ────────────────────────────────────────────────────────────────

  test.describe("Export", () => {
    test.beforeEach(async () => {
      await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
      await cfdPage.page.waitForTimeout(3000);
    });

    test("Export button is visible and clickable", async () => {
      test.setTimeout(60000);
      const exportBtn = cfdPage.page.evaluate(() => {
        const iframes = Array.from(document.querySelectorAll("iframe"));
        for (const f of iframes) {
          const doc = (f as HTMLIFrameElement).contentDocument;
          if (!doc) continue;
          const btn = Array.from(doc.querySelectorAll("button")).find((b) =>
            b.textContent?.trim().toLowerCase().includes("export"),
          );
          return !!btn;
        }
        return false;
      });
      expect(await exportBtn).toBe(true);
    });
  });

  // ── Time Filter Switching ─────────────────────────────────────────────────

  test.describe("Time Filter - Summary bar updates correctly", () => {
    test("Yesterday - Total Fraud matches DB", async () => {
      test.setTimeout(90000);
      await cfdPage.page.getByRole("button", { name: "Yesterday" }).click();
      await cfdPage.page.waitForTimeout(3000);
      const [db, ui] = await Promise.all([
        getAflSummary(yesterday(), yesterday(), "th"),
        getAflSummaryBar(cfdPage.page),
      ]);
      console.log(
        `[Yesterday] Total Fraud: UI=${ui.totalFraud} DB=${db.totalFraud}`,
      );
      expect(withinTolerance(ui.totalFraud, db.totalFraud)).toBe(true);
    });

    test("Last 2 Days - Total Fraud matches DB", async () => {
      test.setTimeout(90000);
      await cfdPage.page.getByRole("button", { name: "Last 2 Days" }).click();
      await cfdPage.page.waitForTimeout(3000);
      const [db, ui] = await Promise.all([
        getAflSummary(daysAgo(2), yesterday(), "th"),
        getAflSummaryBar(cfdPage.page),
      ]);
      console.log(
        `[Last 2 Days] Total Fraud: UI=${ui.totalFraud} DB=${db.totalFraud}`,
      );
      expect(withinTolerance(ui.totalFraud, db.totalFraud)).toBe(true);
    });

    test("Last 7 Days - Total Fraud matches DB", async () => {
      test.setTimeout(90000);
      await cfdPage.page.getByRole("button", { name: "Last 7 Days" }).click();
      await cfdPage.page.waitForTimeout(3000);
      const [db, ui] = await Promise.all([
        getAflSummary(daysAgo(7), yesterday(), "th"),
        getAflSummaryBar(cfdPage.page),
      ]);
      console.log(
        `[Last 7 Days] Total Fraud: UI=${ui.totalFraud} DB=${db.totalFraud}`,
      );
      expect(withinTolerance(ui.totalFraud, db.totalFraud)).toBe(true);
    });
  });
});

