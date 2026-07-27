import { test, expect } from '@playwright/test';
import { AuthenticationPage } from '@shared/pages/AuthenticationPage';
import testData from './authenticationTestData.json';

test.describe('Authentication Tests', () => {
  let authen: AuthenticationPage;

  test.beforeEach(async ({ page }) => {
    authen = new AuthenticationPage(page);
    await authen.navigate();
  });

  for (const data of testData) {
    test(data.label, async ({ page }) => {
      await authen.login(data.username, data.password);

      await expect(page).toHaveURL(data.expectedUrl);
      expect(await authen.isMessageContent(data.messageType, data.expectedMessage)).toBe(true);
    });
  }

  test.afterEach(async ({ page }) => {
    if (page) {
      await page.close();
    }
  });
});