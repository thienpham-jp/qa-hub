import { test, expect } from "@playwright/test";
// import { SomePage } from "@shared/pages/SomePage";

test.describe("<Feature name>", () => {
  test.beforeEach(async ({ page }) => {
    // navigate / login here
  });

  test("<should do something>", async ({ page }) => {
    // arrange / act / assert
    expect(true).toBe(true);
  });
});
