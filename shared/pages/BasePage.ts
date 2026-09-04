import { BrowserContext, Page, Locator } from "@playwright/test";

export class BasePage {
  public page: Page;
  private pageMap: Map<string, Page>;
  private contextMap: Map<Page, BrowserContext>;
  private onPageSwitch?: (newPage: Page) => void;

  constructor(page: Page, onPageSwitch?: (newPage: Page) => void) {
    this.page = page;
    this.onPageSwitch = onPageSwitch;
    this.pageMap = new Map();
    this.contextMap = new Map();
    this.registerPage("main", page);
  }

  registerPage(alias: string, page: Page): void {
    this.pageMap.set(alias, page);
    this.contextMap.set(page, page.context());
    // console.log(`🧭 Registered tab "${alias}" (${page.url()})`);
  }

  async click(locator: string) {
    await this.page.locator(locator).click();
  }

  async fill(locator: string, value: string) {
    await this.page.locator(locator).fill(value);
  }

  async setText(locator: string, value: string) {
    await this.page.locator(locator).fill(value);
  }

  async getText(locator: string) {
    return await this.page.locator(locator).innerText();
  }

  async hover(locator: string) {
    await this.page.locator(locator).hover();
  }

  async goto(url: string, maxRetries: number = 3) {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.page.goto(url, {
          waitUntil: "load",
          timeout: 30000,
        });
        console.log(`✓ Navigation to ${url} successful on attempt ${attempt}`);
        return;
      } catch (error) {
        lastError = error as Error;
        const errorMessage = lastError.message;

        // Check if it's a network error that might be transient
        const isTransientError =
          errorMessage.includes("ERR_HTTP_RESPONSE_CODE_FAILURE") ||
          errorMessage.includes("ERR_CONNECTION_REFUSED") ||
          errorMessage.includes("ERR_NETWORK_CHANGED") ||
          errorMessage.includes("ERR_TUNNEL_CONNECTION_FAILED") ||
          errorMessage.includes("net::ERR_");

        if (!isTransientError) {
          // Non-transient error, fail immediately
          throw error;
        }

        if (attempt < maxRetries) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.warn(
            `⚠ Navigation attempt ${attempt} failed: ${errorMessage}`,
          );
          console.log(
            `  Retrying in ${delayMs}ms... (attempt ${attempt + 1}/${maxRetries})`,
          );
          await this.page.waitForTimeout(delayMs);
        } else {
          console.error(
            `✗ Navigation to ${url} failed after ${maxRetries} attempts`,
          );
          throw error;
        }
      }
    }

    throw lastError || new Error(`Failed to navigate to ${url}`);
  }

  async waitForTimeout(timeout: number) {
    await this.page.waitForTimeout(timeout);
  }

  async selectDropdown(selectLocator: string, valueOption: string) {
    await this.page.selectOption(selectLocator, valueOption);
  }
}
