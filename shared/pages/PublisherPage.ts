import { IstoolsPage } from "./istools-page";

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
