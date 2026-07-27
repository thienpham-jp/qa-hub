import { BrowserContext, Page, Locator  } from '@playwright/test';


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
        this.registerPage('main', page);
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

    async goto(url: string) {
        await this.page.goto(url);
    }

    async waitForTimeout(timeout: number) {
        await this.page.waitForTimeout(timeout);
    }

    async selectDropdown(selectLocator: string, valueOption: string) {
        await this.page.selectOption(selectLocator, valueOption);
    }
}
