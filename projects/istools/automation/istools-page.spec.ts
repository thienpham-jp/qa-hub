import { test, expect } from "@playwright/test";
import { IstoolsPage } from "@shared/pages/istools-page";
import testData from "./istoolsTestData.json";
import {
  ADMIN_PASSWORD,
  ADMIN_USERNAME,
  NORMAL_PASSWORD,
  NORMAL_USERNAME,
} from "@shared/utils/user-helper";

type UserType = "admin" | "normal";

type IstoolsTestData = {
  label: string;
  userType: UserType;
  passwordOverride?: string;
  expectedUrl: string;
  expectedError?: string;
};

const resolveCredentials = (data: IstoolsTestData) => {
  const credentialsByUserType: Record<
    UserType,
    { username: string; password: string }
  > = {
    admin: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
    normal: { username: NORMAL_USERNAME, password: NORMAL_PASSWORD },
  };

  const baseCredentials = credentialsByUserType[data.userType];
  return {
    username: baseCredentials.username,
    password: data.passwordOverride ?? baseCredentials.password,
  };
};

test.describe("Istools Tests", () => {
  let istoolsPage: IstoolsPage;

  test.beforeEach(async ({ page }) => {
    istoolsPage = new IstoolsPage(page);
    await istoolsPage.open();
  });

  for (const data of testData as IstoolsTestData[]) {
    test(data.label, async ({ page }) => {
      const credentials = resolveCredentials(data);
      await istoolsPage.login(credentials.username, credentials.password);

      await expect(page).toHaveURL(data.expectedUrl);

      if (data.expectedError) {
        const errorMessage = await istoolsPage.getErrorMessage();
        expect(errorMessage).toContain(data.expectedError);
      }
    });
  }

  test.afterEach(async ({ page }) => {
    await page.close();
  });
});
