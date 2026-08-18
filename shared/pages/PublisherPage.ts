import { IstoolsPage } from "./istools-page";
import { PUB_PASSWORD, PUB_USERNAME } from "../utils/user-helper";
import type { Page, Locator } from "@playwright/test";

export class PublisherPage extends IstoolsPage {
  usernameTextBox = "input[type='text']";
  passwordTextBox = "input[type='password']";
  signInButton = "button[type='submit']";

  async loginPub(pan: string, siteId: string) {
    const page = this.page;
    const loginUrl = `https://st-istools-id.asean-accesstrade.net/p/partner-account-superlogin-v2?pan=${pan}&siteId=${siteId}`;

    try {
      await page.goto(loginUrl, {
        waitUntil: "domcontentloaded",
        timeout: 90000,
      });
    } catch (error) {
      console.error("❌ Failed to navigate to partner portal:", error);
      throw error;
    }

    try {
      await page.waitForURL("**/dashboard**", { timeout: 90000 });
    } catch (error) {
      console.error("❌ Failed to reach dashboard:", error);
      console.log("📸 Current URL:", page.url());
      throw error;
    }
  }

  async loginPubStag() {
    const page = this.page;
    const signInUrl = `https://publisher-staging.accesstrade.co.id/#/sign-in`;

    try {
      await page.goto(signInUrl, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
    } catch (error) {
      console.error("❌ Failed to navigate to sign-in page:", error);
      throw error;
    }

    try {
      await this.fill(this.usernameTextBox, PUB_USERNAME);
      await this.fill(this.passwordTextBox, PUB_PASSWORD);
      await this.click(this.signInButton);

      await page.waitForLoadState("networkidle");

      await page.waitForURL("**/dashboard**", { timeout: 60000 });
    } catch (error) {
      console.error("❌ Login failed:", error);
      console.log("📸 Current URL:", page.url());
      throw error;
    }
  }

  async loginPubProd(username: string, password: string) {
    const page = this.page;
    const signInUrl = `https://publisher.accesstrade.co.id/#/sign-in`;

    try {
      await page.goto(signInUrl, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
    } catch (error) {
      console.error("❌ Failed to navigate to sign-in page:", error);
      throw error;
    }

    try {
      await this.fill(this.usernameTextBox, username);
      await this.fill(this.passwordTextBox, password);
      await this.click(this.signInButton);

      await page.waitForLoadState("networkidle");

      await page.waitForURL("**/dashboard**", { timeout: 60000 });
    } catch (error) {
      console.error("❌ Login failed:", error);
      console.log("📸 Current URL:", page.url());
      throw error;
    }
  }
}

// Clicks a random campaign card and returns whichever page navigated to the
// details route. Retries because a card can render before its click handler
// is wired up right after a tab switch, making the first click a no-op.
export async function openRandomCampaignDetails(
  page: Page,
  listCampaign: Locator,
): Promise<{ newPage: Page | null; targetPage: Page }> {
  // Wait for at least one campaign card to be visible
  await listCampaign.first().waitFor({ state: "visible", timeout: 30000 });
  // Add extra buffer time for the full list to load after initial visibility
  await page.waitForTimeout(1000);

  for (let attempt = 0; attempt < 3; attempt++) {
    // Check if the page context is still valid
    if (page.context().browser()?.isConnected() === false) {
      throw new Error("Browser context has been closed");
    }

    // Re-query campaign count on each attempt since DOM can change
    let campaignCount = await listCampaign.count();

    // If no campaigns found, wait and retry before giving up
    if (campaignCount === 0) {
      console.warn(
        `[Attempt ${attempt + 1}] No campaign cards found, waiting for list to load...`,
      );
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      campaignCount = await listCampaign.count();

      if (campaignCount === 0) {
        if (attempt < 2) {
          continue;
        }
        throw new Error("No campaign cards found in the list after retries");
      }
    }

    const randomIndex = Math.floor(Math.random() * campaignCount);
    const campaignElement = listCampaign.nth(randomIndex);

    // Ensure element is visible and stable before clicking
    await campaignElement.waitFor({ state: "visible", timeout: 10000 });

    // Add a small delay for click handlers to wire up after DOM stabilization
    await page.waitForTimeout(500);

    // Start listening for a new tab before clicking; if none opens, fall back to same-tab navigation
    const newPagePromise = page
      .context()
      .waitForEvent("page", { timeout: 15000 })
      .catch(() => null);

    try {
      await campaignElement.click({ timeout: 10000 });
    } catch (error) {
      // Element became detached or page state changed; retry
      if (attempt < 2) {
        await page.waitForLoadState("networkidle");
        continue;
      }
      throw error;
    }

    const newPage = await newPagePromise;
    const targetPage = newPage ?? page;

    if (newPage || /\/details\//.test(targetPage.url())) {
      return { newPage, targetPage };
    }

    // Click landed on a card with no navigation yet; let the list settle and retry.
    if (attempt < 2) {
      await page.waitForLoadState("networkidle");
    }
  }

  throw new Error(
    "Clicking a campaign card never navigated to the details page after 3 attempts",
  );
}
