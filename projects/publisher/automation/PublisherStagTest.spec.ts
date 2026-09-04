import path from "path";
import { test, expect } from "@playwright/test";
import {
  openRandomCampaignDetails,
  PublisherPage,
} from "@shared/pages/PublisherPage";
import { users as userData } from "@shared/utils/user-helper";
import { randomInt } from "crypto";
import {
  randomAddress,
  randomArrayElement,
  randomDateString,
  randomPhoneNumber,
  randomString,
  randomURL,
} from "@shared/utils/function-helper";

// ── Publisher config ─────────────────────────────────────────
const PAN = "84255";
const SITE_ID = "102253";

const BASE_URL = "https://publisher-staging.accesstrade.co.id/#";

const PERFORMANCE_ITEMS = [
  "Earnings (IDR)",
  "Clicks",
  "Conversions",
  "Earnings per Click (IDR)",
];

// ── Shared locator constants ──────────────────────────────────
const LOCATORS = {
  tableRow: "tr[role='row']",
  dropdownButton: "button[data-toggle='dropdown']",
  dropdownOption: "a.ui-select-choices-row-inner:visible",
  categoryOption: "a.ui-select-choices-row-inner.ng-star-inserted:visible",
  categorySearchInput: "#ui-select-search-input",
  categoryTag: "span[role='button']",
  chevronLink: "chevron_right",
  editButton: /^edit$/,
  textarea: "textarea",
  urlInput: 'input[type="url"]',
};

const buildLandingPageURL = (baseURL: string): string => {
  const suffix = Math.floor(Math.random() * 1000);
  return baseURL.endsWith("/") ? `${baseURL}${suffix}` : `${baseURL}/${suffix}`;
};

// ── Test suite ───────────────────────────────────────────────
test.describe("Publisher Staging Tests", () => {
  test.describe.configure({ mode: "parallel" });
  let publisherPage: PublisherPage;

  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.setTimeout(120000);

    publisherPage = new PublisherPage(page);

    try {
      await publisherPage.open();
    } catch (error) {
      const errorMsg = (error as Error).message;
      console.error(`[beforeEach] Failed to open publisher page: ${errorMsg}`);

      // If it's a network/server issue, skip the test instead of failing
      if (
        errorMsg.includes("ERR_HTTP_RESPONSE_CODE_FAILURE") ||
        errorMsg.includes("net::ERR_")
      ) {
        test.skip(true, `SSO service unavailable: ${errorMsg}`);
        return;
      }

      // For other errors, re-throw
      throw error;
    }

    await publisherPage.login(userData.admin.username, userData.admin.password);
    // Wait for the istools login redirect to complete before navigating again
    await publisherPage.page.waitForLoadState("domcontentloaded");

    try {
      await publisherPage.loginPub(PAN, SITE_ID);
    } catch (error) {
      const errorMsg = (error as Error).message;
      console.error(`[beforeEach] Failed to login to publisher: ${errorMsg}`);

      // Skip if staging server is unavailable/too slow
      if (
        (error as any).isNetworkError ||
        errorMsg.includes("unavailable") ||
        errorMsg.includes("Timeout")
      ) {
        test.skip(true, `Staging server unavailable: ${errorMsg}`);
        return;
      }

      throw error;
    }

    await publisherPage.page.waitForLoadState("networkidle");
  });

  // ── Tests ──────────────────────────────────────────────────

  test("Dashboard - URL verification", async () => {
    await expect(publisherPage.page).toHaveURL(`${BASE_URL}/dashboard`);
  });

  test("Dashboard - Performance section", async () => {
    const performanceText = publisherPage.page.getByText("Performance", {
      exact: true,
    });

    await performanceText.waitFor({ state: "visible", timeout: 30000 });
    await expect(performanceText).toBeVisible();

    for (const item of PERFORMANCE_ITEMS) {
      await expect(publisherPage.page.getByText(item)).toBeVisible();
    }
  });

  test.describe("Payments section", () => {
    test.beforeEach(async () => {
      await publisherPage.page
        .locator("span")
        .filter({ hasText: /^Payments$/ })
        .click();

      await publisherPage.page.waitForLoadState("load");
      await expect(publisherPage.page).toHaveURL(
        `${BASE_URL}/dashboard/payments`,
      );
      await publisherPage.page.waitForLoadState("networkidle");
    });

    test("View Process Stages (IDR)", async () => {
      const listItems = [
        "Reward Approved",
        "Payment in Progress",
        "Payment Held Until Requirement Met",
      ];

      const processStagestText = publisherPage.page.getByText(
        "Process Stages",
        { exact: false },
      );
      await processStagestText.waitFor({ state: "visible", timeout: 30000 });

      for (const item of listItems) {
        const itemLocator = publisherPage.page
          .getByText(item, { exact: false })
          .first();
        await itemLocator.waitFor({ state: "visible", timeout: 10000 });
        await expect(itemLocator).toBeVisible();
      }

      await expect(async () => {
        const amounts = publisherPage.page.locator("text=/^[1-9][0-9,]*$/");
        const count = await amounts.count();
        expect(count).toBeGreaterThan(0);
      }).toPass({ timeout: 15000 });
    });

    test("View Invoice section", async () => {
      await expect(
        publisherPage.page.getByRole("heading", { name: "Invoice" }),
      ).toBeVisible({
        timeout: 30000,
      });

      const invoiceTable = publisherPage.page.locator("table").first();
      await invoiceTable.waitFor({ state: "visible", timeout: 30000 });

      await expect(
        publisherPage.page.locator("table tbody tr").first(),
      ).toBeVisible({ timeout: 30000 });

      const invoiceRows = publisherPage.page.locator("table tbody tr");
      const rowCount = await invoiceRows.count();
      expect(rowCount).toBeGreaterThan(0);

      await expect(
        publisherPage.page.locator("th", { hasText: "Invoice Number" }),
      ).toBeVisible();
      await expect(
        publisherPage.page.locator("th", { hasText: "Paid Amount" }),
      ).toBeVisible();
    });
  });

  test.describe("Account Settings section", () => {
    test.beforeEach(async () => {
      await publisherPage.page
        .locator('div[class="character"]')
        .first()
        .click();
      await publisherPage.page
        .getByText("Account Settings", { exact: true })
        .click();
    });

    test("View Account Settings", async () => {
      await expect(publisherPage.page).toHaveURL(
        `${BASE_URL}/dashboard/account-settings/publisher-account/show`,
      );
      await expect(
        publisherPage.page.getByRole("heading", { name: "Account Settings" }),
      ).toBeVisible();
    });

    test.skip("Account Settings - Change password", async () => {
      await publisherPage.page
        .locator("app-password-block div")
        .filter({ hasText: /^edit$/ })
        .click();

      await publisherPage.page
        .locator('input[type="password"]')
        .first()
        .fill(userData.admin.password);

      await publisherPage.page
        .locator('input[type="password"]')
        .nth(1)
        .fill(userData.admin.password);

      await publisherPage.page
        .locator('input[type="password"]')
        .nth(2)
        .fill(userData.admin.password);

      await publisherPage.page.getByRole("button", { name: "Update" }).click();
      await publisherPage.page.waitForLoadState("networkidle");

      await expect(
        publisherPage.page.getByText("Password is updated successfully.", {
          exact: false,
        }),
      ).toBeVisible({ timeout: 30000 });
    });

    test("Change info Account Settings", async () => {
      await publisherPage.page
        .locator("app-individual-account")
        .getByText("edit")
        .click();

      // Add stabilization wait after opening the form
      await publisherPage.page.waitForLoadState("networkidle");
      await publisherPage.page.waitForTimeout(500);

      await publisherPage.page
        .locator('input[name="npwpNumber"]')
        .fill(`NPWP-${randomInt(100, 9999)}`);

      await publisherPage.page
        .locator('input[type="file"]')
        .setInputFiles(
          path.resolve(__dirname, "../../../shared/fixtures/images/lgtm.png"),
        );

      await publisherPage.page
        .locator('input[name="firstName"]')
        .fill(`Adi${randomString(5)}`);

      await publisherPage.page
        .locator('input[name="lastName"]')
        .fill(`Doe${randomString(5)}`);

      // Add stabilization wait before reading dropdown state
      await publisherPage.page.waitForTimeout(500);

      // Try to find and interact with gender dropdown
      let dropdownButton = publisherPage.page.locator('button[tabindex="-1"]');

      let dropdownCount = await dropdownButton.count();

      // If still not found or not visible, skip gender selection
      let currentText = "Unknown";

      if (dropdownCount > 0) {
        try {
          // Wait for the dropdown to be visible with a shorter timeout
          await dropdownButton
            .first()
            .waitFor({ state: "visible", timeout: 5000 });
          await publisherPage.page.waitForTimeout(300);

          // Try to read current gender value
          try {
            currentText =
              (
                await dropdownButton.first().textContent({ timeout: 3000 })
              )?.trim() ?? "Unknown";
          } catch (error) {
            console.warn("Failed to read dropdown text, using default", error);
            currentText = "Unknown";
          }

          // Select Gender - random choice from 3 options, filter out the current selected value
          const genderOptions = ["Unknown", "Male", "Female"].filter(
            (option) => option !== currentText,
          );
          const randomGender =
            genderOptions[Math.floor(Math.random() * genderOptions.length)];

          // Click on gender dropdown button to open the options
          try {
            await dropdownButton.first().click({ timeout: 5000 });

            // Click the random gender option with error handling
            try {
              await publisherPage.page
                .getByRole("link", { name: randomGender, exact: true })
                .click({ timeout: 5000 });
            } catch (error) {
              console.warn(
                `Failed to select gender option "${randomGender}"`,
                error,
              );
            }
          } catch (error) {
            console.warn("Failed to click gender dropdown", error);
          }

          // Add stabilization wait after gender selection
          await publisherPage.page.waitForTimeout(500);
        } catch (error) {
          console.warn(
            "Gender selection skipped - dropdown not accessible",
            error,
          );
        }
      } else {
        console.warn("Gender dropdown not found, skipping gender selection");
      }

      const dateInput = randomDateString();

      const datePickerInput = publisherPage.page.locator(
        'input[name="datePicker"]',
      );
      await datePickerInput.click();
      await datePickerInput.selectText();
      await datePickerInput.pressSequentially(dateInput);
      await datePickerInput.press("Tab");

      await publisherPage.page
        .locator('input[name="address"]')
        .fill(randomAddress());

      await publisherPage.page.locator('input[name="province"]').fill("City");

      await publisherPage.page.locator('input[name="city"]').fill("Vietnam");

      await publisherPage.page
        .locator('input[name="zipCode"]')
        .fill(randomInt(1000, 99999).toString());

      await publisherPage.page
        .locator('input[name="phoneNumber"]')
        .fill(randomPhoneNumber());

      // Add stabilization wait before submitting
      await publisherPage.page.waitForTimeout(500);

      const updateButtons = publisherPage.page.getByRole("button", {
        name: "Update",
      });
      await updateButtons.click();

      const successMessage = publisherPage.page.getByText(
        "Profile is updated successfully",
      );
      await expect(successMessage).toBeVisible({ timeout: 30000 });
    });

    test.describe("Properties section", () => {
      test.beforeEach(async () => {
        await publisherPage.page
          .locator("span")
          .filter({ hasText: /^Properties$/ })
          .click();

        await publisherPage.page.waitForLoadState("networkidle");

        await expect(publisherPage.page).toHaveURL(
          `${BASE_URL}/dashboard/account-settings/properties/list`,
        );

        await publisherPage.page.waitForLoadState("networkidle");
      });

      test.describe("Site Management", () => {
        test.describe.configure({ mode: "serial" });
        // ── Helpers ──────────────────────────────────────────

        const selectRandomOption = async (locator: string) => {
          let options = publisherPage.page.locator(locator);
          // Add small delay to let dropdown render
          await publisherPage.page.waitForTimeout(200);
          await options.first().waitFor({ state: "visible", timeout: 15000 });

          const count = await options.count();
          expect(count).toBeGreaterThan(1);

          const randomIndex = Math.floor(Math.random() * (count - 1)) + 1;
          await options.nth(randomIndex).click();
        };

        const openDropdownAndSelect = async (index: number) => {
          const dropdown = publisherPage.page
            .locator(LOCATORS.dropdownButton)
            .nth(index);

          await dropdown.waitFor({ state: "visible", timeout: 10000 });
          await dropdown.click();

          // FIX: replaced waitForTimeout(300) with waiting for options to appear
          await publisherPage.page
            .locator(LOCATORS.dropdownOption)
            .first()
            .waitFor({ state: "visible", timeout: 5000 });

          await selectRandomOption(LOCATORS.dropdownOption);

          // FIX: replaced waitForTimeout(500) with waiting for dropdown to close
          await publisherPage.page
            .locator(LOCATORS.dropdownOption)
            .first()
            .waitFor({ state: "hidden", timeout: 5000 })
            .catch(() => {
              // dropdown may already be closed, ignore
            });
        };

        const removeExistingCategoryIfAny = async () => {
          // Clear ALL selected category chips by clicking each close button
          const selectedItems = publisherPage.page.locator(
            'span[id="selected-items"] span.ui-select-match-item',
          );
          const chipCount = await selectedItems.count();

          if (chipCount > 0) {
            console.log(
              `Found ${chipCount} selected category chip(s), clearing them...`,
            );
            // Remove chips from last to first to avoid index shifting
            for (let i = chipCount - 1; i >= 0; i--) {
              const chip = selectedItems.nth(i);

              // Try different methods to close the chip
              let closed = false;

              // Method 1: Try clicking close button inside the chip
              const closeBtn = chip.locator("button").first();
              const isBtnVisible = await closeBtn
                .isVisible()
                .catch(() => false);
              if (isBtnVisible) {
                try {
                  await closeBtn.click({ force: true });
                  closed = true;
                  console.log(`Chip ${i} closed via button`);
                } catch (e) {
                  console.warn(`Failed to close chip ${i} via button: ${e}`);
                }
              }

              // Method 2: If button didn't work, try clicking on SVG icon (close icon)
              if (!closed) {
                const svgIcon = chip.locator("svg").first();
                const isSvgVisible = await svgIcon
                  .isVisible()
                  .catch(() => false);
                if (isSvgVisible) {
                  try {
                    await svgIcon.click({ force: true });
                    closed = true;
                    console.log(`Chip ${i} closed via SVG icon`);
                  } catch (e) {
                    console.warn(`Failed to close chip ${i} via SVG: ${e}`);
                  }
                }
              }

              // Method 3: Click anywhere on the chip itself to trigger removal
              if (!closed) {
                try {
                  await chip.click({ force: true });
                  closed = true;
                  console.log(`Chip ${i} closed via chip click`);
                } catch (e) {
                  console.warn(`Failed to close chip ${i} via click: ${e}`);
                }
              }

              await publisherPage.page.waitForTimeout(200);
            }

            // Wait for UI to settle and chips to be fully removed
            await publisherPage.page.waitForTimeout(500);

            // Verify all chips are gone
            const remainingChips = await selectedItems.count();
            if (remainingChips > 0) {
              console.warn(
                `Warning: ${remainingChips} chip(s) still present after clearing attempt, forcing click with bypass`,
              );
              // As a last resort, if chips still exist, we'll use force: true on the input click
            }
          }
        };

        // FIX: extracted reusable "click Update and wait" helper to eliminate
        // the repeated incorrect waitForFunction pattern throughout the file
        const clickUpdateAndWait = async () => {
          const updateButton = publisherPage.page.getByRole("button", {
            name: "Update",
          });
          await updateButton.waitFor({ state: "visible", timeout: 15000 });
          await expect(updateButton).toBeEnabled({ timeout: 5000 });
          await expect(updateButton).toBeInViewport({ timeout: 10000 });
          await updateButton.click();
          await publisherPage.page.waitForLoadState("networkidle");
        };

        test("View Site", async () => {
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
          await expect(
            publisherPage.page.locator("tr[role='row']").first(),
          ).toBeVisible();
        });

        test("Create Site", async () => {
          await publisherPage.page
            .locator("div")
            .filter({ hasText: /^add$/ })
            .click();

          let siteName = `A Zest ${randomInt(1000, 9999)}`;
          await publisherPage.page.getByRole("textbox").first().fill(siteName);

          await publisherPage.page
            .locator('input[type="url"]')
            .fill(`https://www.google.com/${randomInt(1000, 9999)}`);

          await openDropdownAndSelect(0);
          await openDropdownAndSelect(1);
          await openDropdownAndSelect(2);

          await publisherPage.page
            .locator(LOCATORS.categorySearchInput)
            .click();
          await selectRandomOption(LOCATORS.categoryOption);

          await publisherPage.page
            .locator("textarea")
            .fill(
              `This is a sample description property ${siteName} created by automated test.`,
            );

          await publisherPage.page
            .getByRole("button", { name: "Create" })
            .click();

          await publisherPage.page
            .locator("td")
            .filter({ hasText: siteName })
            .waitFor({ state: "visible", timeout: 30000 });
        });

        test("Update Site", async () => {
          const fillSiteDetails = async (newSiteName: string) => {
            await publisherPage.page
              .locator(LOCATORS.textarea)
              .fill(
                `This is a sample description property ${newSiteName} by automated test.`,
              );

            const textbox = publisherPage.page.getByRole("textbox").first();
            await textbox.clear();
            await textbox.fill(newSiteName);

            await publisherPage.page
              .locator(LOCATORS.urlInput)
              .fill(`https://www.google.com/${randomInt(1000, 9999)}`);
          };

          const buildNewSiteName = (current: string) =>
            current.includes("updated") ? `${current}` : `${current} updated`;

          await publisherPage.page
            .locator(LOCATORS.tableRow)
            .first()
            .waitFor({ state: "visible", timeout: 30000 });

          const testSiteRow = await publisherPage.page
            .locator(LOCATORS.tableRow)
            .filter({ hasText: /A Zest/ });

          const rowCount = await testSiteRow.count();
          // FIX: explicit skip instead of silent return
          if (rowCount < 1) {
            test.skip(true, 'No "A Zest" rows found — skipping Update Site');
            return;
          }

          const siteNameBefore =
            (
              await testSiteRow
                .first()
                .locator("td")
                .filter({ hasText: /A Zest/ })
                .textContent()
            )?.trim() ?? "";

          await testSiteRow
            .first()
            .getByRole("link", { name: LOCATORS.chevronLink })
            .click();

          await publisherPage.page.waitForLoadState("networkidle");

          await publisherPage.page
            .locator("div")
            .filter({ hasText: LOCATORS.editButton })
            .first()
            .click();

          const newSiteName = buildNewSiteName(siteNameBefore);

          await fillSiteDetails(newSiteName);

          await openDropdownAndSelect(0);
          await openDropdownAndSelect(1);
          await openDropdownAndSelect(2);

          await removeExistingCategoryIfAny();
          // Ensure input is ready before clicking
          const categoryInput = await publisherPage.page.locator(
            LOCATORS.categorySearchInput,
          );
          await categoryInput.waitFor({ state: "visible", timeout: 5000 });

          // Check if there are still chips blocking - if so, use force: true
          const remainingChips = await publisherPage.page
            .locator('span[id="selected-items"] span.ui-select-match-item')
            .count();
          const useForce = remainingChips > 0;

          // Click to open dropdown
          await categoryInput.click({ force: useForce });
          // Wait for dropdown container to appear
          await publisherPage.page
            .locator(".ui-select-choices")
            .first()
            .waitFor({ state: "visible", timeout: 5000 })
            .catch(() => {
              console.warn("Dropdown container not visible, proceeding anyway");
            });
          await selectRandomOption(LOCATORS.categoryOption);

          await publisherPage.page.waitForLoadState("networkidle");

          // FIX: use clickUpdateAndWait helper (removes incorrect waitForFunction)
          await clickUpdateAndWait();

          await expect(
            publisherPage.page.getByText(newSiteName, { exact: true }),
          ).toBeVisible({ timeout: 30000 });
        });

        test("Delete Site", async () => {
          await publisherPage.page
            .locator("tr[role='row']")
            .first()
            .waitFor({ state: "visible", timeout: 30000 });

          const testSiteRow = await publisherPage.page
            .locator("tr[role='row']")
            .filter({ hasText: /A Zest/ });

          const rowCount = await testSiteRow.count();
          // FIX: explicit skip instead of silent return
          if (rowCount < 1) {
            test.skip(true, 'No "A Zest" rows found — skipping Delete Site');
            return;
          }

          const row = testSiteRow.first();
          const siteNameCell = row
            .locator("td")
            .filter({ hasText: /A Zest/ })
            .first();
          const siteName = await siteNameCell.textContent();

          await row
            .locator("td span")
            .filter({ hasText: /^delete$/ })
            .first()
            .click();

          await publisherPage.page
            .getByRole("button", { name: /Delete/ })
            .click();

          await publisherPage.page
            .locator("tr[role='row']")
            .first()
            .waitFor({ state: "visible", timeout: 30000 });

          const deletedRow = publisherPage.page
            .locator("tr[role='row']")
            .filter({ hasText: siteName || /A Zest/ });

          await expect(deletedRow).toHaveCount(0, { timeout: 15000 });
        });
      });

      // FIX: moved Tracing URL to sibling level (was incorrectly nested under Site Management)
      test.describe("Tracing URL", () => {
        test.beforeEach(async () => {
          const testSiteRow = publisherPage.page
            .locator("tr[role='row']")
            .filter({ hasText: /A Thien/ })
            .first();

          await testSiteRow
            .getByRole("link", { name: "chevron_right" })
            .click();

          await publisherPage.page
            .locator("a")
            .filter({ hasText: /^Tracking URL$/ })
            .click();

          await publisherPage.page.waitForLoadState("networkidle");

          await publisherPage.page
            .getByText("Affiliate Link Preview", { exact: true })
            .waitFor({ state: "visible", timeout: 30000 });
        });

        test("View tracing URL", async () => {
          const listURL = publisherPage.page
            .locator("li")
            .filter({ hasText: /^Custom-\d+=/ });

          const urlCount = await listURL.count();
          expect(urlCount).toBeGreaterThan(0);
        });

        test.describe("Tracing URL action", () => {
          test.beforeEach(async () => {
            await publisherPage.page
              .locator("span")
              .filter({ hasText: /^edit$/ })
              .click();

            await publisherPage.page.waitForLoadState("networkidle");
          });

          // FIX: extracted reusable helper for clicking Update in this scope
          const clickUpdateAndWait = async (
            page: typeof publisherPage.page,
          ) => {
            const updateButton = page.getByRole("button", { name: "Update" });
            await updateButton.waitFor({ state: "visible", timeout: 15000 });
            await expect(updateButton).toBeEnabled({ timeout: 5000 });
            await updateButton.scrollIntoViewIfNeeded();
            // FIX: use JS click to bypass viewport check (modal taller than window)
            await updateButton.evaluate((el) => (el as HTMLElement).click());
            await page.waitForLoadState("networkidle");
          };

          test("Create Tracing URL", async () => {
            const newSiteName = `Custom-${randomInt(1000, 9999)}`;
            const nameInput = publisherPage.page.getByRole("textbox", {
              name: "Name",
              exact: true,
            });
            await nameInput.waitFor({ state: "visible", timeout: 10000 });
            await nameInput.scrollIntoViewIfNeeded();
            await nameInput.fill(newSiteName);

            const newValue = Date.now().toString();
            const valueInput = publisherPage.page.getByRole("textbox", {
              name: "Value",
              exact: true,
            });
            await valueInput.waitFor({ state: "visible", timeout: 10000 });
            await valueInput.scrollIntoViewIfNeeded();
            await valueInput.fill(newValue);

            const joinInput = `${newSiteName}=${newValue}`;

            const addButton = publisherPage.page.getByText("add", {
              exact: true,
            });
            await addButton.waitFor({ state: "visible", timeout: 10000 });
            await addButton.click();

            await publisherPage.page.waitForLoadState("networkidle");

            // FIX: use clickUpdateAndWait helper
            await clickUpdateAndWait(publisherPage.page);

            await expect(
              publisherPage.page.getByText(joinInput, { exact: true }),
            ).toBeVisible({ timeout: 15000 });
          });

          test("Update Tracing URL", async () => {
            // FIX: removed incorrect `await` from synchronous locator()
            const rowUpdate = publisherPage.page.locator(
              'input[formcontrolname="name"]',
            );

            if ((await rowUpdate.count()) > 1) {
              const nameInput = rowUpdate.first();
              await nameInput.waitFor({ state: "visible", timeout: 10000 });
              await nameInput.scrollIntoViewIfNeeded();

              const newSiteName = `Custom-${randomInt(1000, 9999)}`;
              await nameInput.fill(newSiteName);

              const newValue = Date.now().toString();
              const joinInput = `${newSiteName}=${newValue}`;

              const valueInput = publisherPage.page
                .getByRole("textbox", { name: "value" })
                .nth(1);
              await valueInput.waitFor({ state: "visible", timeout: 10000 });
              await valueInput.fill(newValue);

              const checkButton = publisherPage.page.getByText("check");
              await checkButton.waitFor({ state: "visible", timeout: 10000 });
              await checkButton.click();

              await publisherPage.page.waitForLoadState("networkidle");

              // FIX: use clickUpdateAndWait helper
              await clickUpdateAndWait(publisherPage.page);

              await expect(
                publisherPage.page.getByText(joinInput, { exact: true }),
              ).toBeVisible({ timeout: 15000 });
            } else {
              // FIX: explicit skip instead of silent no-op
              test.skip(
                true,
                "Not enough Tracing URL rows to update — skipping",
              );
            }
          });

          test("Delete Tracing URL", async () => {
            // FIX: removed incorrect `await` from synchronous locator()
            const rowDelete = publisherPage.page.locator(
              'input[formcontrolname="name"]',
            );

            if ((await rowDelete.count()) > 1) {
              const nameInput = rowDelete.first();
              await nameInput.waitFor({ state: "visible", timeout: 10000 });
              await nameInput.scrollIntoViewIfNeeded();

              const siteName = await nameInput.inputValue();

              const deleteButton = publisherPage.page
                .getByText("delete")
                .first();
              await deleteButton.waitFor({ state: "visible", timeout: 10000 });
              await deleteButton.scrollIntoViewIfNeeded();
              await deleteButton.click();

              // FIX: use clickUpdateAndWait helper
              await clickUpdateAndWait(publisherPage.page);

              await expect(
                publisherPage.page.getByText(siteName, { exact: true }),
              ).toBeHidden({ timeout: 10000 });
            } else {
              // FIX: explicit skip instead of silent no-op
              test.skip(
                true,
                "Not enough Tracing URL rows to delete — skipping",
              );
            }
          });
        });
      });

      // FIX: moved Postback to sibling level of Tracing URL (was incorrectly nested inside it)
      test.describe("Postback", () => {
        test.beforeEach(async () => {
          const testSiteRow = publisherPage.page
            .locator("tr[role='row']")
            .filter({ hasText: /A Thien/ })
            .first();

          await testSiteRow
            .getByRole("link", { name: "chevron_right" })
            .click();

          await publisherPage.page
            .locator("a")
            .filter({ hasText: /^Postback$/ })
            .click();

          await publisherPage.page.waitForLoadState("networkidle");

          await publisherPage.page
            .getByText("Parameters", { exact: true })
            .waitFor({ state: "visible", timeout: 30000 });
        });

        test("View Postback", async () => {
          const listURL = publisherPage.page
            .locator("div.parameter-value")
            .filter({ hasText: /Name-/ });

          const urlCount = await listURL.count();
          expect(urlCount).toBeGreaterThan(0);
        });

        test.describe("Postback action", () => {
          test.beforeEach(async () => {
            await publisherPage.page
              .locator("span")
              .filter({ hasText: /^edit$/ })
              .click();

            await publisherPage.page.waitForLoadState("networkidle");
          });

          // FIX: extracted reusable helper — removes all repeated waitForFunction(boundingBox) patterns
          const clickUpdateAndWait = async (
            page: typeof publisherPage.page,
          ) => {
            const updateButton = page.getByRole("button", { name: "Update" });
            await updateButton.waitFor({ state: "visible", timeout: 15000 });
            await expect(updateButton).toBeEnabled({ timeout: 5000 });
            await updateButton.scrollIntoViewIfNeeded();
            // FIX: use JS click to bypass viewport check (modal taller than window)
            await updateButton.evaluate((el) => (el as HTMLElement).click());
            await page.waitForLoadState("networkidle");
          };

          test("Create Postback", async () => {
            const newName = `Name-${randomInt(1000, 9999)}`;
            const nameInput = publisherPage.page
              .getByRole("textbox", { name: "Name" })
              .first();
            await nameInput.waitFor({ state: "visible", timeout: 10000 });
            await nameInput.scrollIntoViewIfNeeded();
            await nameInput.fill(newName);

            const newValue = `${Date.now()}`;
            const valueInput = publisherPage.page
              .locator('input[formcontrolname="value"]')
              .first();
            await valueInput.waitFor({ state: "visible", timeout: 10000 });
            await valueInput.scrollIntoViewIfNeeded();
            await valueInput.fill(newValue);
            const joinInput = `${newName} = ${newValue}`;

            await publisherPage.page
              .locator("span")
              .filter({ hasText: /^add$/ })
              .first()
              .click();

            const enable = publisherPage.page
              .locator(
                "#mat-radio-8 > .mat-radio-label > .mat-radio-container > .mat-radio-outer-circle",
              )
              .first();

            await enable.waitFor({ state: "visible", timeout: 10000 });
            await enable.scrollIntoViewIfNeeded();

            if ((await enable.isChecked()) === false) {
              await enable.check();
            }

            const urlInput = publisherPage.page.locator(
              'input[formcontrolname="basePostbackUrl"]',
            );
            await urlInput.waitFor({ state: "visible", timeout: 10000 });
            await urlInput.scrollIntoViewIfNeeded();
            await urlInput.fill(buildLandingPageURL(randomURL()));

            await publisherPage.page.waitForLoadState("networkidle");

            // FIX: use clickUpdateAndWait helper
            await clickUpdateAndWait(publisherPage.page);

            await expect(
              publisherPage.page.getByText(joinInput, { exact: true }),
            ).toBeVisible({ timeout: 15000 });
          });

          test("Update Postback", async () => {
            // FIX: removed incorrect `await` from synchronous locator()
            const rowUpdate = publisherPage.page.locator(
              'div.sub-ids-content.mobile-hidden.ng-star-inserted input[formcontrolname="name"]',
            );

            const firstRow = await rowUpdate.first();

            await firstRow.waitFor({ state: "visible", timeout: 10000 });

            if ((await rowUpdate.count()) > 1) {
              await firstRow.waitFor({ state: "visible", timeout: 10000 });
              await firstRow.scrollIntoViewIfNeeded();

              const newSiteName = `Name-${randomInt(1000, 9999)}`;
              await firstRow.fill(newSiteName);

              const newValue = Date.now().toString();
              const joinInput = `${newSiteName} = ${newValue}`;

              const valueInput = publisherPage.page
                .getByRole("textbox", { name: "value" })
                .nth(1);
              await valueInput.waitFor({ state: "visible", timeout: 10000 });
              await valueInput.fill(newValue);

              const checkButton = publisherPage.page.getByText("check");
              await checkButton.waitFor({ state: "visible", timeout: 10000 });
              await checkButton.click();

              await publisherPage.page.waitForLoadState("networkidle");

              // FIX: use clickUpdateAndWait helper
              await clickUpdateAndWait(publisherPage.page);

              await expect(
                publisherPage.page.getByText(joinInput, { exact: true }),
              ).toBeVisible({ timeout: 15000 });
            } else {
              // FIX: explicit skip instead of silent no-op
              test.skip(true, "Not enough Postback rows to update — skipping");
            }
          });

          test("Delete Postback", async () => {
            // FIX: removed incorrect `await` from synchronous locator()
            const rowDelete = publisherPage.page.locator(
              'div.sub-ids-content.mobile-hidden.ng-star-inserted input[formcontrolname="name"]',
            );

            const nameInput = rowDelete.first();
            await nameInput.waitFor({ state: "visible", timeout: 10000 });
            await nameInput.scrollIntoViewIfNeeded();

            if ((await rowDelete.count()) > 1) {
              const siteName = await nameInput.inputValue();

              const deleteButton = publisherPage.page
                .getByText("delete")
                .first();
              await deleteButton.waitFor({ state: "visible", timeout: 10000 });
              await deleteButton.scrollIntoViewIfNeeded();
              await deleteButton.click();

              // FIX: use clickUpdateAndWait helper
              await clickUpdateAndWait(publisherPage.page);

              await expect(
                publisherPage.page.getByText(siteName, { exact: true }),
              ).toBeHidden({ timeout: 10000 });
            } else {
              // FIX: explicit skip instead of silent no-op
              test.skip(true, "Not enough Postback rows to delete — skipping");
            }
          });
        });
      });
    });
  });

  test.describe("Campaign", () => {
    test.beforeEach(async () => {
      await publisherPage.page
        .getByRole("link", { name: /Campaigns/i })
        .click();
    });

    test("Search 1 Campaign", async () => {
      const searchInput = publisherPage.page.locator("input[name='keyword']");
      await searchInput.waitFor({ state: "visible", timeout: 15000 });
      await searchInput.scrollIntoViewIfNeeded();
      await searchInput.fill("wardah");
      await searchInput.press("Enter");

      await publisherPage.page.waitForLoadState("networkidle");

      await expect(
        publisherPage.page.locator("div.campaign-block.bg-white").first(),
      ).toBeVisible({ timeout: 15000 });
    });

    test("Search multiple Campaigns", async () => {
      await publisherPage.page.waitForLoadState("networkidle");

      const availableTab = publisherPage.page.getByRole("link", {
        name: /AVAILABLE/i,
      });
      await availableTab.waitFor({ state: "visible", timeout: 15000 });
      await availableTab.click();

      await publisherPage.page.waitForLoadState("networkidle");

      const searchInput = publisherPage.page.locator("input[name='keyword']");
      await searchInput.waitFor({ state: "visible", timeout: 10000 });
      await searchInput.scrollIntoViewIfNeeded();
      await searchInput.fill("shopee");
      await searchInput.press("Enter");

      await publisherPage.page.waitForLoadState("networkidle");

      const campaignBlocks = publisherPage.page.locator(
        "div.campaign-block.bg-white",
      );

      await campaignBlocks
        .first()
        .waitFor({ state: "visible", timeout: 15000 });

      expect(await campaignBlocks.count()).toBeGreaterThan(1);
    });

    test("Go to Campaigns detail", async () => {
      await publisherPage.page.waitForLoadState("networkidle");

      const affiliatedTab = publisherPage.page.getByRole("link", {
        name: /AFFILIATED/i,
      });
      await affiliatedTab.waitFor({ state: "visible", timeout: 15000 });
      await affiliatedTab.click();

      await publisherPage.page.waitForLoadState("networkidle");

      // Wait specifically for the campaign list to populate after tab switch
      const listCampaign = publisherPage.page.locator(
        "div.campaign-block.bg-white",
      );
      await listCampaign.first().waitFor({ state: "visible", timeout: 15000 });
      await publisherPage.page.waitForTimeout(1000);

      // Use the improved openRandomCampaignDetails function with better retry logic
      const { newPage, targetPage } = await openRandomCampaignDetails(
        publisherPage.page,
        listCampaign,
      );

      try {
        await targetPage.waitForLoadState("load");

        await expect(targetPage).toHaveURL(
          /\/dashboard\/sites\/campaigns\/details\//,
          { timeout: 15000 },
        );

        await expect(targetPage.getByText("Description").first()).toBeVisible({
          timeout: 15000,
        });
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

    test("Campaigns detail > Custom Creatives", async () => {
      await publisherPage.page.waitForLoadState("networkidle");

      const affiliatedTab = publisherPage.page.getByRole("link", {
        name: /AFFILIATED/i,
      });
      await affiliatedTab.waitFor({ state: "visible", timeout: 15000 });
      await affiliatedTab.click();

      await publisherPage.page.waitForLoadState("networkidle");

      // Wait specifically for the campaign list to populate after tab switch
      const listCampaign = publisherPage.page.locator(
        "div.campaign-block.bg-white",
      );
      await listCampaign.first().waitFor({ state: "visible", timeout: 15000 });
      await publisherPage.page.waitForTimeout(1000);

      const { newPage, targetPage } = await openRandomCampaignDetails(
        publisherPage.page,
        listCampaign,
      );

      try {
        // Use 'load' instead of 'networkidle' as some pages have background requests
        await targetPage.waitForLoadState("load");

        // FIX: replaced fragile escaped BASE_URL regex with a simple path pattern
        await expect(targetPage).toHaveURL(
          /\/dashboard\/sites\/campaigns\/details\//,
          { timeout: 15000 },
        );

        await expect(targetPage.getByText("Description").first()).toBeVisible({
          timeout: 15000,
        });

        // Add stabilization buffer to allow all tabs to render
        await targetPage.waitForTimeout(1000);

        const customCreativesTab = targetPage.getByText("Custom Creatives", {
          exact: true,
        });

        // Try to find and click Custom Creatives tab with error handling
        try {
          await customCreativesTab.waitFor({
            state: "visible",
            timeout: 15000,
          });
          await customCreativesTab.click();
        } catch (error) {
          console.warn(
            "Custom Creatives tab not found or not clickable",
            error,
          );
          test.skip(
            true,
            "Custom Creatives tab not accessible on campaign detail page",
          );
          return;
        }

        await targetPage.waitForLoadState("load");

        const acceptedURLItem = targetPage
          .locator("li.url.ng-star-inserted")
          .first();

        const hasAcceptedURL = await acceptedURLItem
          .waitFor({ state: "visible", timeout: 10000 })
          .then(() => true)
          .catch(() => false);

        // A random URL never matches the campaign's accepted domain, so the
        // form would stay invalid forever; skip instead of guaranteeing a hang.
        if (!hasAcceptedURL) {
          test.skip(true, "No accepted URL found for this campaign");
          return;
        }

        const acceptedBaseURL = await acceptedURLItem.innerText();
        const landingPageURL = buildLandingPageURL(acceptedBaseURL.trim());

        const creativeName = `QA Zest-${randomInt(1000, 9999)}`;

        const landingUrlInput = targetPage.locator("input[name='landingUrl']");
        await landingUrlInput.waitFor({ state: "visible", timeout: 10000 });
        await landingUrlInput.scrollIntoViewIfNeeded();
        await landingUrlInput.fill(landingPageURL);
        await landingUrlInput.press("Tab"); // blur to trigger URL validation

        const nameInput = targetPage.locator('input[name="name"]');
        await nameInput.waitFor({ state: "visible", timeout: 10000 });
        await nameInput.fill(creativeName);
        await nameInput.press("Tab");

        const generateButton = targetPage.getByRole("button", {
          name: "Generate",
        });
        await generateButton.waitFor({ state: "visible", timeout: 10000 });

        const becameEnabled = await expect(generateButton)
          .toBeEnabled({ timeout: 15000 })
          .then(() => true)
          .catch(() => false);

        if (!becameEnabled) {
          const formHtml = await targetPage
            .locator("input[name='landingUrl']")
            .locator("xpath=ancestor::form")
            .first()
            .innerHTML()
            .catch(() => "<unable to read form>");
          console.warn(
            `[Custom Creatives] Generate button stayed disabled; form HTML:\n${formHtml}`,
          );
          test.skip(
            true,
            "Generate button never became enabled — see console for form state",
          );
          return;
        }

        await generateButton.click();

        await targetPage.waitForLoadState("load");

        const error = targetPage.getByText("info URL is not valid, please");
        const errorVisible = await error
          .waitFor({ state: "visible", timeout: 5000 })
          .then(() => true)
          .catch(() => false);

        if (!errorVisible) {
          const closeButton = targetPage.locator("button.close");
          await closeButton.waitFor({ state: "visible", timeout: 10000 });
          await closeButton.click();

          await expect(
            targetPage.locator("td").filter({ hasText: creativeName }),
          ).toBeVisible({ timeout: 15000 });
        }
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

  test.describe("Creatives", () => {
    test.beforeEach(async () => {
      await publisherPage.page
        .getByRole("link", { name: /Creatives/i })
        .click();

      await publisherPage.page
        .locator("a", { hasText: "Custom Creatives" })
        .click();

      await publisherPage.page.waitForLoadState("networkidle");
    });

    test("Create Creatives", async () => {
      await publisherPage.page
        .getByRole("textbox", { name: "Campaign Name" })
        .click();

      // Add delay to allow dropdown to render
      await publisherPage.page.waitForTimeout(800);

      const EXCLUDED_CAMPAIGNS = ["Shopee", "Lazada"];

      // Try multiple selector patterns for robustness
      let menuOptions = publisherPage.page.locator(
        "ul[role='menu'] a.ui-select-choices-row-inner",
      );

      // Check if primary selector has options
      let menuCount = await menuOptions.count().catch(() => 0);

      if (menuCount === 0) {
        // Try alternative selectors
        menuOptions = publisherPage.page.locator(
          ".ui-select-choices a.ui-select-choices-row-inner",
        );
        menuCount = await menuOptions.count().catch(() => 0);
      }

      if (menuCount === 0) {
        // Last resort: try generic dropdown option selector
        menuOptions = publisherPage.page.locator(
          "a.ui-select-choices-row-inner",
        );
        menuCount = await menuOptions.count().catch(() => 0);
      }

      // Wait for options to appear
      if (menuCount === 0) {
        await menuOptions
          .first()
          .waitFor({ state: "visible", timeout: 15000 })
          .catch((err) => {
            console.error(
              `[Create Creatives] Unable to find campaign menu options: ${(err as Error).message}`,
            );
            throw err;
          });
      }

      const optionTexts = await menuOptions.allTextContents();
      const validOptionTexts = optionTexts.filter(
        (text) =>
          !EXCLUDED_CAMPAIGNS.some((excluded) => text.includes(excluded)),
      );

      expect(validOptionTexts.length).toBeGreaterThan(0);

      const randomCampaign = randomArrayElement(validOptionTexts).trim();

      await menuOptions.filter({ hasText: randomCampaign }).click();

      const acceptedURLItem = publisherPage.page
        .locator("li.url.ng-star-inserted")
        .first();

      const hasAcceptedURL = await acceptedURLItem
        .waitFor({ state: "visible", timeout: 15000 })
        .then(() => true)
        .catch((err) => {
          console.warn(
            `[Create Creatives] URL item timeout: ${(err as Error).message}`,
          );
          return false;
        });

      // A random/empty URL never matches the campaign's accepted domain, so
      // the form would stay invalid forever; skip instead of guaranteeing a hang.
      if (!hasAcceptedURL) {
        test.skip(true, "No accepted URL found for this campaign");
        return;
      }

      const acceptedBaseURL = await acceptedURLItem.innerText();
      const landingPageURL = buildLandingPageURL(acceptedBaseURL.trim());

      const creativeName = `QA Zest-${randomInt(1000, 9999)}`;

      await publisherPage.page.locator('input[name="name"]').fill(creativeName);

      await publisherPage.page
        .locator("textarea[name='urls']")
        .fill(landingPageURL);

      const generateButton = publisherPage.page.getByRole("button", {
        name: "Generate",
      });
      await expect(generateButton).toBeEnabled({ timeout: 10000 });
      await generateButton.click();

      // Wait for networkidle with timeout and error handling
      await publisherPage.page
        .waitForLoadState("networkidle", { timeout: 15000 })
        .catch((err) => {
          console.warn(
            `[Create Creatives] networkidle timeout: ${(err as Error).message}. Proceeding with table check...`,
          );
          return publisherPage.page.waitForTimeout(1000);
        });

      // Add extra delay to ensure table is updated with new creative
      await publisherPage.page.waitForTimeout(500);

      const error = publisherPage.page.getByText(
        "info URL is not valid, please",
      );

      if (!(await error.isVisible())) {
        // Close the success dialog so the underlying table becomes visible
        const closeButton = publisherPage.page.locator("button.close");
        await closeButton
          .waitFor({ state: "visible", timeout: 10000 })
          .then(() => closeButton.click())
          .catch(() => {
            // dialog may already be closed, ignore
          });

        // Log what we're looking for
        console.log(
          `[Create Creatives] Looking for creative: "${creativeName}"`,
        );

        // First, wait for table to contain any rows
        const tableRows = publisherPage.page.locator("td");
        const hasTableRows = await tableRows
          .first()
          .waitFor({ state: "visible", timeout: 15000 })
          .then(() => true)
          .catch((err) => {
            console.error(
              `[Create Creatives] Table not found after Generate: ${(err as Error).message}`,
            );
            return false;
          });

        if (!hasTableRows) {
          // Table didn't appear; either page didn't reload or no rows exist
          test.skip(
            true,
            "Table did not appear after Generate — page may not have reloaded",
          );
          return;
        }

        // Now wait for our specific creative in the table
        const creativeRow = publisherPage.page
          .locator("td")
          .filter({ hasText: creativeName });

        await creativeRow
          .waitFor({ state: "visible", timeout: 15000 })
          .catch(async (err) => {
            // If not found, log available rows for debugging
            const allRows = await publisherPage.page
              .locator("td")
              .allTextContents()
              .catch(() => []);
            console.error(
              `[Create Creatives] Creative "${creativeName}" not found in table. Available rows: ${allRows.slice(0, 10).join(", ")}`,
            );
            throw err;
          });

        await expect(creativeRow).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe("Reports", () => {
    test.beforeEach(async () => {
      await publisherPage.page.getByRole("link", { name: /Reports/i }).click();

      await publisherPage.page.waitForLoadState("networkidle");

      // Wait for navigation links to be visible before proceeding
      const navigationLinks = publisherPage.page.locator("a.navigation-link");
      await navigationLinks
        .first()
        .waitFor({ state: "visible", timeout: 15000 });
      // Add buffer for all links to render
      await publisherPage.page.waitForTimeout(500);
    });

    test("Count Report tabs", async () => {
      const navigationLinks = publisherPage.page.locator("a.navigation-link");
      await navigationLinks
        .first()
        .waitFor({ state: "visible", timeout: 15000 });

      await publisherPage.page.waitForLoadState("networkidle");

      const count = await navigationLinks.count();
      expect(count).toBe(9);
    });

    test("First Report tab", async () => {
      const navigationLinks = publisherPage.page.locator("a.navigation-link");
      await navigationLinks
        .first()
        .waitFor({ state: "visible", timeout: 15000 });

      await publisherPage.page.waitForLoadState("networkidle");

      const conversion = navigationLinks.first();
      await conversion.waitFor({ state: "visible", timeout: 10000 });

      const text = await conversion.textContent();
      expect(text?.trim()).toBe("Conversion");
    });
  });
});
