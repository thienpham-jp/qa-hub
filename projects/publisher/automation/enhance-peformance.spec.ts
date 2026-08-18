import { test, expect } from "@playwright/test";
import {
  openRandomCampaignDetails,
  PublisherPage,
} from "@shared/pages/PublisherPage";
import { users as userData } from "@shared/utils/user-helper";

// ── Publisher config ─────────────────────────────────────────
const BASE_URL_STAG = "https://publisher-staging.accesstrade.co.id/#";
const BASE_URL_PROD = "https://publisher.accesstrade.co.id/#";

// ── Test suite ───────────────────────────────────────────────
test.describe.skip("Publisher Staging Enhance Performance Tests @stag", () => {
  test.describe.configure({ mode: "parallel" });
  let publisherPage: PublisherPage;

  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.setTimeout(90000);

    publisherPage = new PublisherPage(page);
    await publisherPage.loginPubStag();
    // Wait for the istools login redirect to complete before navigating again
    await publisherPage.page.waitForLoadState("domcontentloaded");
  });

  test("Sign In - log time @sp", async () => {
    const dashboardStartTime = Date.now();
    console.log(`[Sign In Load] Starting URL verification...`);

    await publisherPage.loginPubStag();

    const dashboardLoadTime = Date.now() - dashboardStartTime;
    console.log(
      `[Sign In Load] URL verified. Time taken: ${dashboardLoadTime}ms`,
    );

    await publisherPage.page.waitForLoadState("networkidle");

    const dashboardTotalTime = Date.now() - dashboardStartTime;
    console.log(
      `[Sign In Load] Sign In page fully loaded. Total time: ${dashboardTotalTime}ms`,
    );
  });

  // ── Tests ──────────────────────────────────────────────────

  test("Dashboard - URL verification @db", async () => {
    const dashboardStartTime = Date.now();
    console.log(`[Dashboard Load] Starting URL verification...`);

    await expect(publisherPage.page).toHaveURL(`${BASE_URL_STAG}/dashboard`);

    const dashboardLoadTime = Date.now() - dashboardStartTime;
    console.log(
      `[Dashboard Load] URL verified. Time taken: ${dashboardLoadTime}ms`,
    );

    await publisherPage.page.waitForLoadState("networkidle");

    const dashboardTotalTime = Date.now() - dashboardStartTime;
    console.log(
      `[Dashboard Load] Dashboard fully loaded. Total time: ${dashboardTotalTime}ms`,
    );
  });

  test.describe("Campaign", () => {
    test.beforeEach(async () => {
      await publisherPage.page
        .getByRole("link", { name: /Campaigns/i })
        .click();
      await publisherPage.page.waitForLoadState("networkidle");
    });

    test("Load Campaign page @cp", async () => {
      const dashboardStartTime = Date.now();
      console.log(`[Campaign Load] Starting URL verification...`);

      await publisherPage.page
        .getByRole("link", { name: /Campaigns/i })
        .click();

      const dashboardLoadTime = Date.now() - dashboardStartTime;
      console.log(
        `[Campaign Load] URL verified. Time taken: ${dashboardLoadTime}ms`,
      );

      await publisherPage.page.waitForLoadState("networkidle");

      const dashboardTotalTime = Date.now() - dashboardStartTime;
      console.log(
        `[Campaign Load] Campaign page fully loaded. Total time: ${dashboardTotalTime}ms`,
      );

      await expect(publisherPage.page).toHaveURL(
        `${BASE_URL_STAG}/dashboard/sites/campaigns/listing/recommended`,
      );
    });

    test("Go to Recommended Campaigns detail  @rcm", async () => {
      await publisherPage.page
        .getByRole("button", { name: /A Thien/i })
        .first()
        .click();
      await publisherPage.page
        .locator("a", { hasText: /Vario ID/i })
        .first()
        .click();

      await publisherPage.page.waitForLoadState("networkidle");

      const listCampaign = publisherPage.page.locator(
        "div.campaign-block.bg-white",
      );
      // Wait specifically for the campaign list to populate
      await listCampaign.first().waitFor({ state: "visible", timeout: 15000 });
      await publisherPage.page.waitForTimeout(1000);

      const dashboardStartTime = Date.now();
      console.log(`[Rcm Campaign Load] Starting URL verification...`);

      const { newPage, targetPage } = await openRandomCampaignDetails(
        publisherPage.page,
        listCampaign,
      );

      try {
        const dashboardLoadTime = Date.now() - dashboardStartTime;
        console.log(
          `[Rcm Campaign Load] URL verified. Time taken: ${dashboardLoadTime}ms`,
        );

        await targetPage.waitForLoadState("networkidle");

        await expect(targetPage).toHaveURL(
          /\/dashboard\/sites\/campaigns\/details\//,
          { timeout: 15000 },
        );

        await expect(targetPage.getByText("Description").first()).toBeVisible({
          timeout: 15000,
        });

        const dashboardTotalTime = Date.now() - dashboardStartTime;
        console.log(
          `[Rcm Campaign Load] Rcm Campaign page fully loaded. Total time: ${dashboardTotalTime}ms`,
        );
      } finally {
        if (newPage && !newPage.isClosed?.()) {
          try {
            await newPage.close();
          } catch (e) {
            console.error("Failed to close new page:", e);
          }
        }
      }
    });

    test("Go to Aff Campaigns detail @aff", async () => {
      await publisherPage.page
        .getByRole("button", { name: /A Thien/i })
        .first()
        .click();
      await publisherPage.page
        .locator("a", { hasText: /Vario ID/i })
        .first()
        .click();

      await publisherPage.page.waitForLoadState("networkidle");

      const affiliatedTab = publisherPage.page.getByRole("link", {
        name: /AFFILIATED/i,
      });
      await affiliatedTab.waitFor({ state: "visible", timeout: 12000 });
      await affiliatedTab.click();

      await publisherPage.page.waitForLoadState("networkidle");

      // Wait specifically for the campaign list to populate after tab switch
      const listCampaign = publisherPage.page.locator(
        "div.campaign-block.bg-white",
      );
      await listCampaign.first().waitFor({ state: "visible", timeout: 15000 });
      await publisherPage.page.waitForTimeout(1000);

      const dashboardStartTime = Date.now();
      console.log(`[Affiliated Campaign Load] Starting URL verification...`);

      const { newPage, targetPage } = await openRandomCampaignDetails(
        publisherPage.page,
        listCampaign,
      );

      try {
        const dashboardLoadTime = Date.now() - dashboardStartTime;
        console.log(
          `[Affiliated Campaign Load] URL verified. Time taken: ${dashboardLoadTime}ms`,
        );

        await targetPage.waitForLoadState("networkidle");

        await expect(targetPage).toHaveURL(
          /\/dashboard\/sites\/campaigns\/details\//,
          { timeout: 15000 },
        );

        await expect(targetPage.getByText("Description").first()).toBeVisible({
          timeout: 15000,
        });

        const dashboardTotalTime = Date.now() - dashboardStartTime;
        console.log(
          `[Affiliated Campaign Load] Aff Campaign page fully loaded. Total time: ${dashboardTotalTime}ms`,
        );
      } finally {
        if (newPage && !newPage.isClosed?.()) {
          try {
            await newPage.close();
          } catch (e) {
            console.error("Failed to close new page:", e);
          }
        }
      }
    });
  });

  test.describe("Reports", () => {
    test("Load Reports page @rp", async () => {
      const dashboardStartTime = Date.now();
      console.log(`[Reports Load] Starting URL verification...`);

      await publisherPage.page.getByRole("link", { name: /Reports/i }).click();

      const dashboardLoadTime = Date.now() - dashboardStartTime;
      console.log(
        `[Reports Load] URL verified. Time taken: ${dashboardLoadTime}ms`,
      );

      await publisherPage.page.waitForLoadState("networkidle");

      const dashboardTotalTime = Date.now() - dashboardStartTime;
      console.log(
        `[Reports Load] Reports page fully loaded. Total time: ${dashboardTotalTime}ms`,
      );

      await expect(publisherPage.page).toHaveURL(
        `${BASE_URL_STAG}/dashboard/sites/reports/conversion`,
      );
    });

    test("Load Conversion Reports page @cv", async () => {
      const page = publisherPage.page;

      // --- Navigate to Reports ---
      await page.getByRole("link", { name: /Reports/i }).click();

      const userMenuButton = page
        .getByRole("button", { name: /A Thien/i })
        .first();
      await userMenuButton.waitFor({ state: "visible", timeout: 10000 });
      await userMenuButton.click();

      const varioIdLink = page.locator("a", { hasText: /Vario ID/i }).first();
      await varioIdLink.waitFor({ state: "visible", timeout: 10000 });
      await varioIdLink.click();

      // --- Filter by date range ---
      await page.getByRole("textbox").click();

      const lastMonthOption = page
        .getByRole("listitem")
        .filter({ hasText: "Last Month" });
      await lastMonthOption.waitFor({ state: "visible", timeout: 10000 });
      await lastMonthOption.click();

      await page.getByRole("button", { name: "Search" }).click();
      await page.waitForLoadState("networkidle");

      // --- Select a specific row / filter ---
      const targetRow = page.getByRole("table").getByText("Shopee ID NON KOL");
      await targetRow.waitFor({ state: "visible", timeout: 15000 });
      await targetRow.click();

      const dashboardStartTime = Date.now();
      console.log(`[Conversion Reports Load] Starting URL verification...`);

      // --- Change page size: 10 -> 100 ---
      const pageSize10Button = page.getByRole("button", { name: "10" });
      await pageSize10Button.click();

      const pageSize100Button = page.getByRole("button", { name: "100" });
      await pageSize100Button.waitFor({ state: "visible", timeout: 5000 });
      await pageSize100Button.click();

      await page.waitForLoadState("networkidle");

      // Assert table actually re-rendered with new page size, not just network idle
      await expect(page.getByRole("table")).toBeVisible({ timeout: 15000 });

      const dashboardLoadTimeP1 = Date.now() - dashboardStartTime;
      console.log(
        `[Conversion Reports Load page 1] Page size updated to 100. Time taken: ${dashboardLoadTimeP1}ms`,
      );

      // --- Go to page 2 of pagination ---
      const page2StartTime = Date.now();

      const page2Button = page.getByRole("button", { name: "2" });
      await page2Button.waitFor({ state: "visible", timeout: 10000 });
      await page2Button.click();

      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("table")).toBeVisible({ timeout: 15000 });

      const dashboardLoadTimeP2 = Date.now() - page2StartTime;
      console.log(
        `[Conversion Reports Load page 2] Load page 2. Time taken: ${dashboardLoadTimeP2}ms`,
      );

      const dashboardTotalTime = Date.now() - dashboardStartTime;
      console.log(
        `[Conversion Reports Load] Reports page fully loaded. Total time: ${dashboardTotalTime}ms`,
      );
    });
  });
});

// ── Test suite ───────────────────────────────────────────────
test.describe("Publisher Production Enhance Performance Tests @prod", () => {
  test.describe.configure({ mode: "parallel" });
  let publisherPage: PublisherPage;

  test.beforeEach(async ({ page }, testInfo) => {
    // Increase timeout for login operations
    testInfo.setTimeout(90000); // 90 seconds for the entire hook

    publisherPage = new PublisherPage(page);
    await publisherPage.loginPubProd(
      userData.pubUser.username,
      userData.pubUser.password,
    );

    await publisherPage.page.waitForLoadState("networkidle");
  });

  // ── Tests ──────────────────────────────────────────────────

  test("Sign In - log time @sp", async () => {
    const dashboardStartTime = Date.now();
    console.log(`[Sign In Load] Starting URL verification...`);

    await publisherPage.loginPubProd(
      userData.pubUser.username,
      userData.pubUser.password,
    );

    const dashboardLoadTime = Date.now() - dashboardStartTime;
    console.log(
      `[Sign In Load] URL verified. Time taken: ${dashboardLoadTime}ms`,
    );

    await publisherPage.page.waitForLoadState("networkidle");

    const dashboardTotalTime = Date.now() - dashboardStartTime;
    console.log(
      `[Sign In Load] Sign In page fully loaded. Total time: ${dashboardTotalTime}ms`,
    );
  });

  test("Dashboard - URL verification @db", async () => {
    const dashboardStartTime = Date.now();
    console.log(`[Dashboard Load] Starting URL verification...`);

    await expect(publisherPage.page).toHaveURL(`${BASE_URL_PROD}/dashboard`);

    const dashboardLoadTime = Date.now() - dashboardStartTime;
    console.log(
      `[Dashboard Load] URL verified. Time taken: ${dashboardLoadTime}ms`,
    );

    await publisherPage.page.waitForLoadState("networkidle");

    const dashboardTotalTime = Date.now() - dashboardStartTime;
    console.log(
      `[Dashboard Load] Dashboard fully loaded. Total time: ${dashboardTotalTime}ms`,
    );
  });

  test.describe("Campaign", () => {
    test.beforeEach(async () => {
      await publisherPage.page
        .getByRole("link", { name: /Campaigns/i })
        .click();
    });

    test("Load Campaign page @cp", async () => {
      const dashboardStartTime = Date.now();
      console.log(`[Campaign Load] Starting URL verification...`);

      await publisherPage.page
        .getByRole("link", { name: /Campaigns/i })
        .click();

      const dashboardLoadTime = Date.now() - dashboardStartTime;
      console.log(
        `[Campaign Load] URL verified. Time taken: ${dashboardLoadTime}ms`,
      );

      await publisherPage.page.waitForLoadState("networkidle");

      const dashboardTotalTime = Date.now() - dashboardStartTime;
      console.log(
        `[Campaign Load] Campaign page fully loaded. Total time: ${dashboardTotalTime}ms`,
      );

      await expect(publisherPage.page).toHaveURL(
        `${BASE_URL_PROD}/dashboard/sites/campaigns/listing/recommended`,
      );
    });

    test("Go to Recommended Campaigns detail  @rcm", async () => {
      await publisherPage.page.waitForLoadState("networkidle");

      const listCampaign = publisherPage.page.locator(
        "div.campaign-block.bg-white",
      );
      // Wait specifically for the campaign list to populate
      await listCampaign.first().waitFor({ state: "visible", timeout: 15000 });
      await publisherPage.page.waitForTimeout(1000);

      const dashboardStartTime = Date.now();
      console.log(`[Rcm Campaign Load] Starting URL verification...`);

      const { newPage, targetPage } = await openRandomCampaignDetails(
        publisherPage.page,
        listCampaign,
      );

      try {
        const dashboardLoadTime = Date.now() - dashboardStartTime;
        console.log(
          `[Rcm Campaign Load] URL verified. Time taken: ${dashboardLoadTime}ms`,
        );

        await targetPage.waitForLoadState("networkidle");

        await expect(targetPage).toHaveURL(
          /\/dashboard\/sites\/campaigns\/details\//,
          { timeout: 15000 },
        );

        await expect(targetPage.getByText("Description").first()).toBeVisible({
          timeout: 15000,
        });

        const dashboardTotalTime = Date.now() - dashboardStartTime;
        console.log(
          `[Rcm Campaign Load] Rcm Campaign page fully loaded. Total time: ${dashboardTotalTime}ms`,
        );
      } finally {
        if (newPage && !newPage.isClosed?.()) {
          try {
            await newPage.close();
          } catch (e) {
            console.error("Failed to close new page:", e);
          }
        }
      }
    });

    test("Go to Aff Campaigns detail @aff", async () => {
      const affiliatedTab = publisherPage.page.getByRole("link", {
        name: /AFFILIATED/i,
      });
      await affiliatedTab.waitFor({ state: "visible", timeout: 12000 });
      await affiliatedTab.click();

      await publisherPage.page.waitForLoadState("networkidle");

      // Wait specifically for the campaign list to populate after tab switch
      const listCampaign = publisherPage.page.locator(
        "div.campaign-block.bg-white",
      );
      await listCampaign.first().waitFor({ state: "visible", timeout: 15000 });
      await publisherPage.page.waitForTimeout(1000);

      const dashboardStartTime = Date.now();
      console.log(`[Affiliated Campaign Load] Starting URL verification...`);

      const { newPage, targetPage } = await openRandomCampaignDetails(
        publisherPage.page,
        listCampaign,
      );

      try {
        const dashboardLoadTime = Date.now() - dashboardStartTime;
        console.log(
          `[Affiliated Campaign Load] URL verified. Time taken: ${dashboardLoadTime}ms`,
        );

        await targetPage.waitForLoadState("networkidle");

        await expect(targetPage).toHaveURL(
          /\/dashboard\/sites\/campaigns\/details\//,
          { timeout: 15000 },
        );

        await expect(targetPage.getByText("Description").first()).toBeVisible({
          timeout: 15000,
        });

        const dashboardTotalTime = Date.now() - dashboardStartTime;
        console.log(
          `[Affiliated Campaign Load] Aff Campaign page fully loaded. Total time: ${dashboardTotalTime}ms`,
        );
      } finally {
        if (newPage && !newPage.isClosed?.()) {
          try {
            await newPage.close();
          } catch (e) {
            console.error("Failed to close new page:", e);
          }
        }
      }
    });
  });

  test.describe("Reports", () => {
    test("Load Reports page @rp", async () => {
      const dashboardStartTime = Date.now();
      console.log(`[Reports Load] Starting URL verification...`);

      await publisherPage.page.getByRole("link", { name: /Reports/i }).click();

      const dashboardLoadTime = Date.now() - dashboardStartTime;
      console.log(
        `[Reports Load] URL verified. Time taken: ${dashboardLoadTime}ms`,
      );

      await publisherPage.page.waitForLoadState("networkidle");

      const dashboardTotalTime = Date.now() - dashboardStartTime;
      console.log(
        `[Reports Load] Reports page fully loaded. Total time: ${dashboardTotalTime}ms`,
      );

      await expect(publisherPage.page).toHaveURL(
        `${BASE_URL_PROD}/dashboard/sites/reports/conversion`,
      );
    });
  });

  test.afterEach(async () => {
    await publisherPage.page.close();
  });
});
