import { chromium, firefox, webkit, Browser, Page, BrowserContext, LaunchOptions } from '@playwright/test';

export class WebBase {
    public static PAGE_LOAD_TIMEOUT = 15000;
    public static IMPLICIT_WAIT = 10000;

    public baseURL: string;
    public username: string;
    public password: string;
    public browser: Browser | null = null;
    public context: BrowserContext | null = null;
    public page: Page | null = null;

    constructor(config: { baseURL: string; username: string; password: string }) {
        this.baseURL = config.baseURL;
        this.username = config.username;
        this.password = config.password;
    }

    async setup(browserType: 'chromium' | 'firefox' | 'webkit' = 'chromium', headless: boolean = false) {
        let launchOptions: LaunchOptions = {
            headless,
            args: [
                '--disable-save-password-bubble',
                '--disable-features=PasswordManagerEnabled',
                '--disable-features=AutofillServerCommunication',
                '--disable-features=AutofillEnableAccountWalletStorage',
                '--disable-notifications',
                '--disable-features=PasswordLeakDetection',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-features=BlockInsecurePrivateNetworkRequests',
                '--allow-insecure-localhost',
            ],
            timeout: WebBase.PAGE_LOAD_TIMEOUT
        };

        switch (browserType) {
            case 'chromium':
                this.browser = await chromium.launch(launchOptions);
                break;
            case 'firefox':
                this.browser = await firefox.launch(launchOptions);
                break;
            case 'webkit':
                this.browser = await webkit.launch(launchOptions);
                break;
            default:
                this.browser = await chromium.launch(launchOptions);
        }

        this.context = await this.browser.newContext({
            viewport: { width: 1920, height: 1080 },
            permissions: ['notifications']
        });
        this.page = await this.context.newPage();
        await this.page.goto(this.baseURL, { timeout: WebBase.PAGE_LOAD_TIMEOUT });
        await this.context.clearCookies();
    }

    async tearDown() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}