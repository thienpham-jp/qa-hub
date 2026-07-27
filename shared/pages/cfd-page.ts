import { BasePage } from "./BasePage";

export class CFDPage extends BasePage {
  usernameTextBox = "input[type='text']";
  passwordTextBox = "input[type='password']";
  signInButton = "button[kind='secondary']";

  async login(country: string = "ID", username: string, password: string) {
    const page = this.page;
    const idUrl = `https://stag-cfd-db-id.asean-accesstrade.net/`;
    const thUrl = `https://stag-cfd-db-th.asean-accesstrade.net/`;

    try {
      if (country.toUpperCase().includes("ID")) {
        await page.goto(idUrl, {
          waitUntil: "networkidle",
          timeout: 60000,
        });
      } else if (country.toUpperCase().includes("TH")) {
        await page.goto(thUrl, {
          waitUntil: "networkidle",
          timeout: 60000,
        });
      }
    } catch (error) {
      console.error("❌ Failed to navigate to sign-in page:", error);
      throw error;
    }

    try {
      await this.fill(this.usernameTextBox, username);
      await this.fill(this.passwordTextBox, password);
      await this.click(this.signInButton);

      await page.waitForLoadState("networkidle");

      await page.waitForURL("**/?_t=**", { timeout: 60000 });
    } catch (error) {
      console.error("❌ Login failed:", error);
      console.log("📸 Current URL:", page.url());
      throw error;
    }
  }
}
