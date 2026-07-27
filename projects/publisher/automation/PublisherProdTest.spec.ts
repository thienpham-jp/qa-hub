import { test, expect } from "@playwright/test";
import { PublisherPage } from "@shared/pages/PublisherPage";
import { users as userData } from "@shared/utils/user-helper";
import {
  randomAddress,
  randomDateString,
  randomInt,
  randomPhoneNumber,
  randomString,
} from "@shared/utils/function-helper";

const BASE_URL = "https://publisher.accesstrade.co.id/#";

const PERFORMANCE_ITEMS = [
  "Earnings (IDR)",
  "Clicks",
  "Conversions",
  "Earnings per Click (IDR)",
];

// ── Test suite ───────────────────────────────────────────────
test.describe("Publisher Production Tests", () => {
  test.describe.configure({ mode: "parallel" });
  let publisherPage: PublisherPage;

  test.beforeEach(async ({ page }, testInfo) => {
    // Increase timeout for login operations
    testInfo.setTimeout(90000); // 90 seconds for the entire hook

    publisherPage = new PublisherPage(page);
    await publisherPage.loginPubProd(
      userData.pubUser.username,
      userData.pubUser.password,
    );

    await publisherPage.page.waitForLoadState("networkidle");
  });

  // ── Tests ──────────────────────────────────────────────────

  test("Dashboard - URL verification", async () => {
    await expect(publisherPage.page).toHaveURL(`${BASE_URL}/dashboard`);
  });

  test.skip("Dashboard - Performance section", async () => {
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
      // Wait for Invoice section heading to appear
      await expect(
        publisherPage.page.getByRole("heading", { name: "Invoice" }),
      ).toBeVisible({
        timeout: 30000,
      });

      // Wait for table to render
      const invoiceTable = publisherPage.page.locator("table").first();
      await invoiceTable.waitFor({ state: "visible", timeout: 30000 });

      // Wait specifically for tbody rows to be populated (not just table shell)
      await expect(
        publisherPage.page.locator("table tbody tr").first(),
      ).toBeVisible({ timeout: 30000 });

      const invoiceRows = publisherPage.page.locator("table tbody tr");
      const rowCount = await invoiceRows.count();
      expect(rowCount).toBeGreaterThan(0);

      // Bonus: verify columns exist
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
      // 1. Click on the user profile icon
      await publisherPage.page
        .locator('div[class="character"]')
        .first()
        .click();
      // 2. Click on 'Account Settings' in the dropdown
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

    test("Account Settings - Change password", async () => {
      // 1. Click on 'Change Password' edit button
      await publisherPage.page
        .locator("app-password-block div")
        .filter({ hasText: /^edit$/ })
        .click();

      // 2. Input current password
      await publisherPage.page
        .locator('input[type="password"]')
        .first()
        .fill(userData.pubUser.password);

      // 3. Input new password
      await publisherPage.page
        .locator('input[type="password"]')
        .nth(1)
        .fill(userData.pubUser.password);

      // 4. Input confirm new password
      await publisherPage.page
        .locator('input[type="password"]')
        .nth(2)
        .fill(userData.pubUser.password);

      // 5. Click on 'Update' button
      await publisherPage.page.getByRole("button", { name: "Update" }).click();
      await publisherPage.page.waitForLoadState("networkidle");

      // 6. Expect success message is visible
      await expect(
        publisherPage.page.getByText("Password is updated successfully.", {
          exact: false,
        }),
      ).toBeVisible({ timeout: 30000 });
    });

    test("Change info Account Settings", async () => {
      // 1. Click on 'Certification Info' edit button
      await publisherPage.page
        .locator("app-individual-account")
        .getByText("edit")
        .click();

      // 2. Input NPWP number
      await publisherPage.page
        .locator('input[name="npwpNumber"]')
        .fill(`NPWP-${randomInt(100, 9999)}`);

      // 3. Input NPWP Photo
      await publisherPage.page
        .locator('input[type="file"]')
        .setInputFiles("D:/git/qa-hub/shared/fixtures/images/lgtm.png");

      // 3. Input first name
      await publisherPage.page
        .locator('input[name="firstName"]')
        .fill(`Thien${randomString(5)}`);

      // 4. Input last name
      await publisherPage.page
        .locator('input[name="lastName"]')
        .fill(`Pham${randomString(5)}`);

      // get current selected gender value
      const dropdownButton = publisherPage.page.locator(
        "button[data-toggle='dropdown']",
      );
      const currentText = (await dropdownButton.textContent())?.trim() ?? "";

      // 5. Select Gender - random choice from 3 options, filter out the current selected value to ensure the test can run multiple times without manual reset
      const genderOptions = ["Unknown", "Male", "Female"].filter(
        (option) => option !== currentText,
      );
      const randomGender =
        genderOptions[Math.floor(Math.random() * genderOptions.length)];

      // Click on gender dropdown button to open the options
      await dropdownButton.click();

      // Click the random gender option
      await publisherPage.page
        .getByRole("link", { name: randomGender, exact: true })
        .click();

      // 6. Input Valid Birthday
      await publisherPage.page
        .locator('input[name="datePicker"]')
        .fill(randomDateString());

      // 7. Input Street
      await publisherPage.page
        .locator('input[name="address"]')
        .fill(randomAddress());

      // 8. Input Province
      await publisherPage.page.locator('input[name="province"]').fill("City");

      // 9. Input City
      await publisherPage.page.locator('input[name="city"]').fill("Vietnam");

      // 10. Input Zip Code
      await publisherPage.page
        .locator('input[name="zipCode"]')
        .fill(randomInt(1000, 99999).toString());

      // 11. Input Phone Number
      await publisherPage.page
        .locator('input[name="phoneNumber"]')
        .fill(randomPhoneNumber());

      // 13. Click on 'Update' button
      const updateButtons = publisherPage.page.getByRole("button", {
        name: "Update",
      });
      await updateButtons.click();

      // 14. Expect success message is visible
      const successMessage = publisherPage.page.getByText(
        "Profile is updated successfully",
      );

      await expect(successMessage).toBeVisible();
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
        // ============================================================
        // HELPERS
        // ============================================================
        const LOCATORS = {
          tableRow: "tr[role='row']",
          dropdownButton: "button[data-toggle='dropdown']",
          dropdownOption: "a.ui-select-choices-row-inner:visible",
          categoryOption:
            "a.ui-select-choices-row-inner.ng-star-inserted:visible",
          categorySearchInput: "#ui-select-search-input",
          categoryTag: "span[role='button']",
          chevronLink: "chevron_right",
          editButton: /^edit$/,
          textarea: "textarea",
          urlInput: 'input[type="url"]',
        };

        const selectRandomOption = async (locator: string) => {
          const options = publisherPage.page.locator(locator);
          await options.first().waitFor({ state: "visible", timeout: 10000 });

          const count = await options.count();
          expect(count).toBeGreaterThan(1);

          const randomIndex = Math.floor(Math.random() * (count - 1)) + 1;
          await options.nth(randomIndex).click();
        };

        const openDropdownAndSelect = async (index: number) => {
          const dropdown = publisherPage.page
            .locator(LOCATORS.dropdownButton)
            .nth(index);

          // Wait for dropdown to be visible and clickable
          await dropdown.waitFor({ state: "visible", timeout: 10000 });
          await dropdown.click();

          // Wait for dropdown options to appear
          await publisherPage.page.waitForTimeout(300);

          await selectRandomOption(LOCATORS.dropdownOption);

          // Wait for dropdown to close and page to stabilize
          await publisherPage.page.waitForTimeout(500);
        };

        const removeExistingCategoryIfAny = async () => {
          const tags = publisherPage.page.locator(LOCATORS.categoryTag);
          const count = await tags.count();
          if (count > 1) {
            await tags.nth(1).click();
          }
        };

        test("View Site", async () => {
          await expect(
            publisherPage.page.getByRole("heading", { name: "Property List" }),
          ).toBeVisible();
          await expect(
            publisherPage.page.locator("tr[role='row']").first(),
          ).toBeVisible();
        });

        test.skip("Create Site", async () => {
          // 1. Click on 'Add' button
          await publisherPage.page
            .locator("div")
            .filter({ hasText: /^add$/ })
            .click();
          // 2. Input Site Name
          const siteName = `A Test ${randomInt(1000, 9999)}`;
          await publisherPage.page.getByRole("textbox").first().fill(siteName);
          // 3. Input Site URL
          await publisherPage.page
            .locator('input[type="url"]')
            .fill(`https://www.google.com/${randomInt(1000, 9999)}`);

          // Select dropdowns: 4. Type, 5. Traffic, 6. Lead Generation
          await openDropdownAndSelect(0);
          await openDropdownAndSelect(1);
          await openDropdownAndSelect(2);

          // 7. Select Category
          // await removeExistingCategoryIfAny();
          await publisherPage.page
            .locator(LOCATORS.categorySearchInput)
            .click();
          await selectRandomOption(LOCATORS.categoryOption);
          // 8. Input Description <textarea>
          await publisherPage.page
            .locator("textarea")
            .fill(
              `This is a sample description property ${siteName} created by automated test.`,
            );
          // 9.Click on 'Create' button
          await publisherPage.page
            .getByRole("button", { name: "Create" })
            .click();
          // 10. Expect new site is visible in the site list
          await publisherPage.page
            .locator("td")
            .filter({ hasText: siteName })
            .waitFor({ state: "visible", timeout: 30000 });
        });

        test.skip("Update Site", async () => {
          // ============================================================
          // HELPERS
          // ============================================================

          const fillSiteDetails = async (newSiteName: string) => {
            // Description
            await publisherPage.page
              .locator(LOCATORS.textarea)
              .fill(
                `This is a sample description property ${newSiteName} by automated test.`,
              );

            // Site Name
            const textbox = publisherPage.page.getByRole("textbox").first();
            await textbox.clear();
            await textbox.fill(newSiteName);

            // Site URL
            await publisherPage.page
              .locator(LOCATORS.urlInput)
              .fill(`https://www.google.com/${randomInt(1000, 9999)}`);
          };

          const buildNewSiteName = (current: string) =>
            current.includes("updated")
              ? `${current} ${randomInt(1000, 9999)}`
              : `${current} updated`;

          // ============================================================
          // TEST BODY
          // ============================================================
          await publisherPage.page
            .locator(LOCATORS.tableRow)
            .first()
            .waitFor({ state: "visible", timeout: 30000 });

          const testSiteRow = publisherPage.page
            .locator(LOCATORS.tableRow)
            .filter({ hasText: /A Test/ });

          const rowCount = await testSiteRow.count();
          if (rowCount < 1) return;

          // Get current site name
          const siteNameBefore =
            (
              await testSiteRow
                .first()
                .locator("td")
                .filter({ hasText: /A Test/ })
                .textContent()
            )?.trim() ?? "";

          // Open edit dialog
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

          // Select dropdowns: Type, Traffic, Lead Generation
          await openDropdownAndSelect(0);
          await openDropdownAndSelect(1);
          await openDropdownAndSelect(2);

          // Select Category
          await removeExistingCategoryIfAny();
          await publisherPage.page
            .locator(LOCATORS.categorySearchInput)
            .click();
          await selectRandomOption(LOCATORS.categoryOption);

          // Fill text fields last (prevent reset by Angular digest)
          await fillSiteDetails(newSiteName);

          // Wait for the page to be fully stable before clicking Update
          await publisherPage.page.waitForLoadState("networkidle");

          // Give the form a moment to fully render
          await publisherPage.page.waitForTimeout(500);

          // Ensure Update button is visible and enabled before clicking
          const updateButton = publisherPage.page.getByRole("button", {
            name: "Update",
          });
          await updateButton.waitFor({ state: "visible", timeout: 10000 });

          // Submit
          await updateButton.click();

          // Wait for the dialog to close (looking for the modal overlay to disappear or button to be disabled)
          await publisherPage.page.waitForTimeout(1000);

          // Wait for network idle to ensure backend processing is complete
          await publisherPage.page.waitForLoadState("networkidle");

          // Verify updated name appears in table by checking if the text is visible in the DOM
          await expect(
            publisherPage.page.getByText(newSiteName, { exact: true }),
          ).toBeVisible({ timeout: 30000 });
        });

        test.skip("Delete Site", async () => {
          await publisherPage.page
            .locator("tr[role='row']")
            .first()
            .waitFor({ state: "visible", timeout: 30000 });

          // 1. Find a site with "A Test" in the name
          const testSiteRow = publisherPage.page
            .locator("tr[role='row']")
            .filter({ hasText: /A Test/ });

          // Check if the site exists
          const rowCount = await testSiteRow.count();

          if (rowCount < 1) return;

          const row = testSiteRow.first();

          // Get the site name from the row
          const siteNameCell = row
            .locator("td")
            .filter({ hasText: /A Test/ })
            .first();

          const siteName = await siteNameCell.textContent();

          // 2. Click the delete icon/button in the row
          await row
            .locator("td span")
            .filter({ hasText: /^delete$/ })
            .first()
            .click();

          // 3. Click confirm delete button in the dialog
          await publisherPage.page
            .getByRole("button", { name: /Delete/ })
            .click();

          await publisherPage.page
            .locator("tr[role='row']")
            .first()
            .waitFor({ state: "visible", timeout: 30000 });

          // 4. Verify the site is no longer in the list
          const deletedRow = publisherPage.page
            .locator("tr[role='row']")
            .filter({ hasText: siteName || /A Test/ });

          await expect(deletedRow).toHaveCount(0, { timeout: 15000 });
        });
      });

      test.describe.skip("Tracing URL", () => {
        test.beforeEach(async () => {
          const testSiteRow = publisherPage.page
            .locator("tr[role='row']")
            .filter({ hasText: /A Thien/ })
            .first();

          // Open edit dialog
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

        test.describe("Tracing URL action", async () => {
          test.beforeEach(async () => {
            // 1. Click on edit button
            await publisherPage.page
              .locator("span")
              .filter({ hasText: /^edit$/ })
              .click();

            // 2. Wait for form to load
            await publisherPage.page.waitForLoadState("networkidle");
          });

          test("Create Tracing URL", async () => {
            // 3. Input name and value for the new tracing URL
            const newSiteName = `Custom-${randomInt(1000, 9999)}`;
            await publisherPage.page
              .getByRole("textbox", { name: "Name", exact: true })
              .fill(newSiteName);

            const newValue = Date.now().toString();
            await publisherPage.page
              .getByRole("textbox", {
                name: "Value",
                exact: true,
              })
              .fill(newValue);

            const joinInput = `${newSiteName}=${newValue}`;

            // 4. Click add button
            await publisherPage.page.getByText("add", { exact: true }).click();

            // Wait for form to stabilize after the check action
            await publisherPage.page.waitForLoadState("networkidle");
            await publisherPage.page.waitForTimeout(500);

            // 5. Confirm Update button
            const updateButton = publisherPage.page.getByRole("button", {
              name: "Update",
            });
            await updateButton.waitFor({ state: "visible", timeout: 10000 });

            // Scroll button into view and ensure it's clickable
            await updateButton.scrollIntoViewIfNeeded();
            await publisherPage.page.waitForTimeout(300);

            await updateButton.click();

            // Wait for form submission to complete
            await publisherPage.page.waitForLoadState("networkidle");

            // 6. Expect new tracing URL is visible in the list
            await expect(
              publisherPage.page.getByText(joinInput, { exact: true }),
            ).toBeVisible();
          });

          test("Update Tracing URL", async () => {
            const rowUpdate = publisherPage.page.locator(
              'input[formcontrolname="name"]',
            );

            if ((await rowUpdate.count()) > 1) {
              const nameInput = rowUpdate.first();

              // 3. Input new name and value for the tracing URL
              const newSiteName = `Custom-${randomInt(1000, 9999)}`;
              await nameInput.fill(newSiteName);

              const newValue = Date.now().toString();

              const joinInput = `${newSiteName}=${newValue}`;

              await publisherPage.page
                .getByRole("textbox", { name: "value" })
                .nth(1)
                .fill(newValue);

              // 4. Click check button
              await publisherPage.page.getByText("check").click();

              // Wait for form to stabilize after the check action
              await publisherPage.page.waitForLoadState("networkidle");
              await publisherPage.page.waitForTimeout(500);

              // 5. Confirm Update button
              const updateButton = publisherPage.page.getByRole("button", {
                name: "Update",
              });
              await updateButton.waitFor({ state: "visible", timeout: 10000 });

              // Scroll button into view and ensure it's clickable
              await updateButton.scrollIntoViewIfNeeded();
              await publisherPage.page.waitForTimeout(300);

              await updateButton.click();

              // Wait for form submission to complete
              await publisherPage.page.waitForLoadState("networkidle");

              // 6 Expect updated tracing URL is visible in the list
              await expect(
                publisherPage.page.getByText(joinInput, { exact: true }),
              ).toBeVisible();
            }
          });

          test("Delete Tracing URL", async () => {
            const rowDelete = await publisherPage.page.locator(
              'input[formcontrolname="name"]',
            );

            if ((await rowDelete.count()) > 1) {
              const nameInput = rowDelete.first();

              const siteName = await nameInput.inputValue();

              // 3. Click delete button
              await publisherPage.page.getByText("delete").first().click();

              // 4. Confirm Update button
              await publisherPage.page
                .getByRole("button", { name: "Update" })
                .click();

              // 5. Expect the tracing URL is removed from the list
              await expect(
                publisherPage.page.getByText(siteName, { exact: true }),
              ).toBeHidden();
            }
          });
        });
      });

      test.describe.skip("Postback", () => {
        test.beforeEach(async () => {
          const testSiteRow = publisherPage.page
            .locator("tr[role='row']")
            .filter({ hasText: /A Thien/ })
            .first();

          // Open edit dialog
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

        test.describe("Postback action", async () => {
          test.beforeEach(async () => {
            // 1. Click on edit button
            await publisherPage.page
              .locator("span")
              .filter({ hasText: /^edit$/ })
              .click();

            // 2. Wait for form to load
            await publisherPage.page.waitForLoadState("networkidle");
          });

          test("Create Postback", async () => {
            // 3. Input name for the new postback
            const newName = `Name-${randomInt(1000, 9999)}`;
            await publisherPage.page
              .getByRole("textbox", { name: "Name" })
              .first()
              .fill(newName);

            // 4. Input value for the new postback
            const newValue = `${Date.now()}`;
            await publisherPage.page
              .locator('input[formcontrolname="value"]')
              .first()
              .fill(newValue);
            const joinInput = `${newName} = ${newValue}`;

            // 5. Click add button
            await publisherPage.page
              .locator("span")
              .filter({ hasText: /^add$/ })
              .first()
              .click();

            // scroll to see radio button if appears
            const enable = publisherPage.page
              .locator(
                "#mat-radio-8 > .mat-radio-label > .mat-radio-container > .mat-radio-outer-circle",
              )
              .first();

            await enable.waitFor({ state: "visible", timeout: 10000 });
            await enable.scrollIntoViewIfNeeded();

            // 6. if radio button appears, select "Create new postback"
            if ((await enable.isChecked()) === false) {
              await enable.check();
            }

            // await publisherPage.page
            //   .locator('input[formcontrolname="basePostbackUrl"]')
            //   .fill(buildLandingPageURL(randomURL()));

            // 7. Click confirm update button
            const updateButton = publisherPage.page.getByRole("button", {
              name: "Update",
            });
            await updateButton.waitFor({ state: "visible", timeout: 10000 });
            await updateButton.click();

            // 8. Expect new postback is visible in the list
            await expect(
              publisherPage.page.getByText(joinInput, { exact: true }),
            ).toBeVisible();
          });

          test("Update Postback", async () => {
            const rowUpdate = await publisherPage.page.locator(
              'div.sub-ids-content.mobile-hidden.ng-star-inserted input[formcontrolname="name"]',
            );

            if ((await rowUpdate.count()) > 1) {
              const nameInput = rowUpdate.first();

              // 3. Input new name and value for the postback
              const newSiteName = `Name-${randomInt(1000, 9999)}`;
              await nameInput.fill(newSiteName);

              const newValue = Date.now().toString();

              const joinInput = `${newSiteName} = ${newValue}`;

              await publisherPage.page
                .getByRole("textbox", { name: "value" })
                .nth(1)
                .fill(newValue);

              // 4. Click check button
              await publisherPage.page.getByText("check").click();

              // Wait for form to stabilize after the check action
              await publisherPage.page.waitForLoadState("networkidle");
              await publisherPage.page.waitForTimeout(500);

              // 5. Confirm Update button
              const updateButton = publisherPage.page.getByRole("button", {
                name: "Update",
              });
              await updateButton.waitFor({ state: "visible", timeout: 10000 });

              // Scroll button into view and ensure it's clickable
              await updateButton.scrollIntoViewIfNeeded();
              await publisherPage.page.waitForTimeout(300);

              await updateButton.click();

              // Wait for form submission to complete
              await publisherPage.page.waitForLoadState("networkidle");

              // 6 Expect updated tracing URL is visible in the list
              await expect(
                publisherPage.page.getByText(joinInput, { exact: true }),
              ).toBeVisible();
            }
          });

          test("Delete Postback", async () => {
            const rowDelete = await publisherPage.page.locator(
              'div.sub-ids-content.mobile-hidden.ng-star-inserted input[formcontrolname="name"]',
            );

            const nameInput = rowDelete.first();

            await nameInput.waitFor({ state: "visible", timeout: 10000 });

            if ((await rowDelete.count()) > 1) {
              const siteName = await nameInput.inputValue();

              // 3. Click delete button
              await publisherPage.page.getByText("delete").first().click();

              // 4. Confirm Update button
              await publisherPage.page
                .getByRole("button", { name: "Update" })
                .click();

              // 5. Expect the tracing URL is removed from the list
              await expect(
                publisherPage.page.getByText(siteName, { exact: true }),
              ).toBeHidden();
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
      await searchInput.waitFor({ state: "visible", timeout: 10000 });
      await searchInput.scrollIntoViewIfNeeded();
      await searchInput.fill("zataru");
      await searchInput.press("Enter");

      await publisherPage.page.waitForLoadState("networkidle");

      await expect(
        publisherPage.page.locator("div.campaign-block.bg-white").first(),
      ).toBeVisible({ timeout: 15000 });
    });

    test("Search multiple Campaigns", async () => {
      const availableTab = publisherPage.page.getByRole("link", {
        name: /AVAILABLE/i,
      });
      await availableTab.waitFor({ state: "visible", timeout: 10000 });
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
      const affiliatedTab = publisherPage.page.getByRole("link", {
        name: /AFFILIATED/i,
      });
      await affiliatedTab.waitFor({ state: "visible", timeout: 10000 });
      await affiliatedTab.click();

      await publisherPage.page.waitForLoadState("networkidle");

      const listCampaign = publisherPage.page.locator(
        "div.campaign-block.bg-white",
      );

      await listCampaign.first().waitFor({ state: "visible", timeout: 30000 });
      const campaignCount = await listCampaign.count();

      const randomIndex = Math.floor(Math.random() * campaignCount);

      // Start listening for a new tab before clicking; if none opens, fall back to same-tab navigation
      const newPagePromise = publisherPage.page
        .context()
        .waitForEvent("page", { timeout: 5000 })
        .catch(() => null);

      await listCampaign.nth(randomIndex).click();

      const newPage = await newPagePromise;
      const targetPage = newPage ?? publisherPage.page;

      try {
        await targetPage.waitForLoadState("networkidle");

        await expect(targetPage).toHaveURL(
          /\/dashboard\/sites\/campaigns\/details\//,
          { timeout: 15000 },
        );

        await expect(targetPage.getByText("Description").first()).toBeVisible({
          timeout: 15000,
        });
      } finally {
        if (newPage) {
          await newPage.close();
        }
      }
    });
  });

  test.describe("Reports", () => {
    test.beforeEach(async () => {
      // 1. Click on the Reports menu
      await publisherPage.page.getByRole("link", { name: /Reports/i }).click();

      await publisherPage.page.waitForLoadState("networkidle");
    });

    test("Count Report tabs", async () => {
      // 2. Click on Report tab
      const count = await publisherPage.page
        .locator("a.navigation-link")
        .count();

      expect(count).toBe(9);
    });

    test("First Report tab", async () => {
      // 2. Click on Report tab
      const conversion = await publisherPage.page
        .locator("a.navigation-link")
        .first();

      const text = await conversion.textContent();

      expect(text?.trim()).toBe("Conversion");
    });
  });

  test.afterEach(async () => {
    await publisherPage.page.close();
  });
});
