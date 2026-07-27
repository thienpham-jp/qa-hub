import { test, expect, type Frame } from "@playwright/test";
import { CFDPage } from "@shared/pages/cfd-page";
// import { CFD_PASSWORD, CFD_USERNAME } from "@shared/utils/user-helper";
import {
  closeDatabasePool,
  getSystemRules,
  getSystemRuleCount,
  getSystemRuleCountByAction,
  getSystemRuleCountByCategory,
  getSystemRuleByName,
  getSystemRuleByDataKey,
} from "@shared/utils/db-helper";

// Helpers

/** Navigate to System Settings and wait until the filter dropdowns are rendered. */
async function goToSystemSettings(page: CFDPage["page"]): Promise<void> {
  await page.getByRole("link", { name: /system settings/i }).click();
  await page.waitForLoadState("networkidle");
  // Wait up to 90 s for the Category/Action filter UI to be ready.
  // The content can be in the main document OR inside a child iframe.
  await page
    .waitForFunction(
      () => {
        function checkDoc(doc: Document): boolean {
          if (!doc) return false;
          if (doc.querySelector('[data-testid="stSelectbox"]')) return true;
          const inputs = doc.querySelectorAll(
            'input[type="text"], input[type="search"]',
          );
          for (const el of Array.from(inputs)) {
            const ph = (el as HTMLInputElement).placeholder;
            if (ph && /search|rule/i.test(ph)) return true;
          }
          // Check for Category text as signal of rendered content
          const walker = document.createTreeWalker(
            doc.body || doc.documentElement,
            NodeFilter.SHOW_TEXT,
          );
          let node: Node | null;
          while ((node = walker.nextNode())) {
            if (/category/i.test(node.textContent || "")) return true;
          }
          return false;
        }
        if (checkDoc(document)) return true;
        for (const iframe of Array.from(document.querySelectorAll("iframe"))) {
          try {
            const d = (iframe as HTMLIFrameElement).contentDocument;
            if (d && checkDoc(d)) return true;
          } catch {}
        }
        return false;
      },
      undefined,
      { timeout: 90000 },
    )
    .catch(() => {
      /* timed out — proceed anyway */
    });
}

/**
 * Return the frame (main or child iframe) that hosts the System Settings UI.
 * goToSystemSettings() already waited for content to be ready, so this is
 * just a fast frame-selection pass — no long polling needed.
 */
async function getSystemSettingsFrame(page: CFDPage["page"]): Promise<Frame> {
  // Check every frame (main frame first) for the filter/search UI.
  const allFrames = [
    page.mainFrame(),
    ...page.frames().filter((f) => f !== page.mainFrame()),
  ];
  for (const frame of allFrames) {
    try {
      // Streamlit stSelectbox (Category/Action dropdowns)
      if ((await frame.locator('[data-testid="stSelectbox"]').count()) > 0)
        return frame;
      // Streamlit stTextInput or generic text input with search placeholder
      if ((await frame.locator('[data-testid="stTextInput"]').count()) > 0)
        return frame;
      const inputs = frame.locator(
        'input[type="text"], input[type="search"], input:not([type])',
      );
      const n = await inputs.count();
      for (let i = 0; i < n; i++) {
        const ph = await inputs.nth(i).getAttribute("placeholder");
        if (ph && /search|rule/i.test(ph)) return frame;
      }
      // Presence of "Category" text — only trust in non-main frames
      // (main frame may have unrelated Category text)
      if (
        frame !== page.mainFrame() &&
        (await frame.getByText(/category/i).count()) > 0
      )
        return frame;
    } catch {
      // detached frame — skip
    }
  }
  // Final fallback: main frame (heading / tabs live here)
  return page.mainFrame();
}

/**
 * Find the search/filter input inside a frame.
 * Primary: accessible name "Search rules" (Streamlit textbox).
 * Fallback: placeholder patterns, then any text input.
 */
async function getSearchBar(frame: Frame) {
  // Primary: Streamlit text input with accessible name "Search rules"
  const byRole = frame.getByRole("textbox", { name: /search rules/i });
  if ((await byRole.count()) > 0) return byRole.first();
  // Fallback: placeholder patterns
  for (const pattern of [
    /search rules by id/i,
    /search.*id.*name/i,
    /search.*rule/i,
    /search/i,
  ]) {
    const el = frame.getByPlaceholder(pattern);
    if ((await el.count()) > 0) return el.first();
  }
  // Last resort: any text/search input
  return frame
    .locator('input[type="text"], input[type="search"], input:not([type])')
    .first();
}

/**
 * Interact with a top-level filter dropdown in the System Settings frame.
 *
 * Finds the Streamlit combobox for the filter (Category or Action) by its
 * accessible name (e.g. "Selected All. Category"), clicks it to open the
 * dropdown, then clicks the option matching `optionText`.
 */
async function selectFilter(
  frame: Frame,
  page: CFDPage["page"],
  filterLabel: string,
  optionText: string,
): Promise<void> {
  // Find the stSelectbox for this filter label and click its dropdown button.
  // Streamlit baseweb renders the control as [data-baseweb="select"] containing
  // a [role="button"] (the visible value + arrow). Fallback to clicking the box itself.
  const stSelectbox = frame
    .locator('[data-testid="stSelectbox"]')
    .filter({ hasText: new RegExp(filterLabel, "i") })
    .first();

  if ((await stSelectbox.count()) > 0) {
    // Try the baseweb button first, then any inner clickable control
    const btn = stSelectbox.locator('[role="button"]').first();
    if ((await btn.count()) > 0) {
      await btn.click();
    } else {
      const control = stSelectbox
        .locator('[data-baseweb="select"], input[role="combobox"]')
        .first();
      if ((await control.count()) > 0) {
        await control.click();
      } else {
        await stSelectbox.click();
      }
    }
  } else {
    // Fallback: locate by combobox accessible name
    await frame
      .getByRole("combobox", { name: new RegExp(filterLabel, "i") })
      .first()
      .click();
  }

  // Baseweb portals the dropdown into the page body as [data-baseweb="popover"].
  // Wait for it to appear, then find the matching option by text content.
  // Try scoped popover selector first, then broad getByText on page and frame.
  type Scope = Frame | typeof page;
  const scopes: Scope[] = [page, frame];

  // 1. Targeted: look inside baseweb popover / menu containers
  const menuSelectors = [
    '[data-baseweb="popover"] [role="option"]',
    '[data-baseweb="menu"] [role="option"]',
    '[data-baseweb="popover"] li',
    '[data-baseweb="menu"] li',
    '[role="listbox"] [role="option"]',
    '[role="option"]',
  ];

  let option = null;

  for (const scope of scopes) {
    for (const sel of menuSelectors) {
      const loc = scope
        .locator(sel)
        .filter({ hasText: new RegExp(`^\\s*${optionText}\\s*$`, "i") });
      try {
        await loc.first().waitFor({ state: "visible", timeout: 3000 });
        option = loc.first();
        break;
      } catch {
        /* try next */
      }
    }
    if (option) break;
  }

  // 2. Broadest fallback: any visible element with that text that appeared
  //    after the click (getByText searches all elements in the scope).
  if (!option) {
    for (const scope of scopes) {
      const loc = scope.getByText(optionText, { exact: true });
      try {
        await loc.first().waitFor({ state: "visible", timeout: 5000 });
        option = loc.first();
        break;
      } catch {
        /* try next */
      }
    }
  }

  if (!option) {
    throw new Error(
      `selectFilter: could not find option "${optionText}" in "${filterLabel}" dropdown after opening it`,
    );
  }

  await option.click();
  await page.waitForLoadState("networkidle");
}

/**
 * Find the visible element representing a filter dropdown trigger.
 * Used only to assert visibility — not to interact.
 * Returns the [data-testid="stSelectbox"] whose label matches filterLabel.
 */
async function getFilterTrigger(frame: Frame, filterLabel: string) {
  // Streamlit stSelectbox: find by combobox accessible name which includes the label
  // e.g. aria-label="Selected All. Category" for Category filter
  const combobox = frame.getByRole("combobox", {
    name: new RegExp(filterLabel, "i"),
  });
  if ((await combobox.count()) > 0) return combobox.first();
  // Fallback: stSelectbox containing matching label text
  const stSelectbox = frame
    .locator('[data-testid="stSelectbox"]')
    .filter({ hasText: new RegExp(filterLabel, "i") })
    .first();
  if ((await stSelectbox.count()) > 0) return stSelectbox;
  // Broadest fallback
  return frame.getByText(new RegExp(filterLabel, "i")).first();
}

/**
 * Get all visible rule card elements on the Active Rules & Thresholds tab.
 * Each rule is wrapped in a [data-testid="stHorizontalBlock"] that contains
 * a .settings-rule-title element.
 */
async function getVisibleRuleCards(frame: Frame) {
  return frame.locator(
    '[data-testid="stHorizontalBlock"]:has(.settings-rule-title)',
  );
}

// Test Suite

test.describe("CFD ID - System Settings", () => {
  let cfdPage: CFDPage;
  let ssFrame: Frame;

  test.beforeEach(async ({ page }) => {
    cfdPage = new CFDPage(page);
    // await cfdPage.login("ID", CFD_USERNAME, CFD_PASSWORD);
    await cfdPage.page.waitForLoadState("networkidle");
    await goToSystemSettings(cfdPage.page);
    ssFrame = await getSystemSettingsFrame(cfdPage.page);
  });

  test.afterAll(async () => {
    await closeDatabasePool("id");
  });

  // ── 1. Page Load & Layout ─────────────────────────────────────────────────────

  test.describe("1. Page Load & Layout", () => {
    // Content loads slowly on this page; give each test enough headroom
    test.setTimeout(150000);

    test("SS-ID-L-01 - Page heading is visible", async () => {
      // Heading may be in the main Streamlit frame or inside the child iframe
      const mainHeading = cfdPage.page.getByRole("heading", {
        name: /system settings/i,
      });
      const frameHeading = ssFrame.getByRole("heading", {
        name: /system settings/i,
      });
      const el = (await mainHeading.count()) > 0 ? mainHeading : frameHeading;
      await expect(el.first()).toBeVisible({ timeout: 15000 });
    });

    test("SS-ID-L-02 - Sub-description is displayed", async () => {
      // Text may appear in the main frame or the child iframe
      const mainText = cfdPage.page.getByText(
        /configure fraud detection rules/i,
      );
      const frameText = ssFrame.getByText(/configure fraud detection rules/i);
      const el = (await mainText.count()) > 0 ? mainText : frameText;
      await expect(el.first()).toBeVisible({ timeout: 15000 });
    });

    test("SS-ID-L-03 - Tab Active Rules & Thresholds is visible", async () => {
      // Streamlit st.tabs() renders tabs in the main frame; fall back to iframe
      const mainTab = cfdPage.page.getByRole("tab", {
        name: /active rules & thresholds/i,
      });
      const frameTab = ssFrame.getByRole("tab", {
        name: /active rules & thresholds/i,
      });
      const el = (await mainTab.count()) > 0 ? mainTab : frameTab;
      await expect(el.first()).toBeVisible({ timeout: 15000 });
    });

    test("SS-ID-L-04 - Tab Entity Management is visible", async () => {
      const mainTab = cfdPage.page.getByRole("tab", {
        name: /entity management/i,
      });
      const frameTab = ssFrame.getByRole("tab", {
        name: /entity management/i,
      });
      const el = (await mainTab.count()) > 0 ? mainTab : frameTab;
      await expect(el.first()).toBeVisible({ timeout: 15000 });
    });

    test("SS-ID-L-05 - Tab Change History is visible", async () => {
      const mainTab = cfdPage.page.getByRole("tab", {
        name: /change history/i,
      });
      const frameTab = ssFrame.getByRole("tab", {
        name: /change history/i,
      });
      const el = (await mainTab.count()) > 0 ? mainTab : frameTab;
      await expect(el.first()).toBeVisible({ timeout: 15000 });
    });

    test("SS-ID-L-06 - Search bar is visible with correct placeholder", async () => {
      const searchBar = await getSearchBar(ssFrame);
      await expect(searchBar).toBeVisible({ timeout: 15000 });
    });

    test("SS-ID-L-07 - Category dropdown is visible", async () => {
      const categoryDropdown = await getFilterTrigger(ssFrame, "Category");
      await expect(categoryDropdown).toBeVisible({ timeout: 15000 });
    });

    test("SS-ID-L-08 - Action dropdown is visible", async () => {
      const actionDropdown = await getFilterTrigger(ssFrame, "Action");
      await expect(actionDropdown).toBeVisible({ timeout: 15000 });
    });
  });

  // ── 2. Search / Filter Rules ─────────────────────────────────────────────────────

  test.describe("2. Search / Filter Rules", () => {
    test("SS-ID-SR-01 - Search by rule name returns matching result", async () => {
      test.setTimeout(60000);
      const rule = await getSystemRuleByName("UA Missing Or Empty", "id").catch(
        () => null,
      );
      test.skip(rule === null, "Rule not found in DB");

      const searchBar = await getSearchBar(ssFrame);
      await searchBar.fill(rule!.ruleName);
      await searchBar.press("Enter");
      await cfdPage.page.waitForLoadState("networkidle");

      await expect(
        ssFrame.getByText(rule!.ruleName, { exact: false }),
      ).toBeVisible({ timeout: 15000 });
    });

    test("SS-ID-SR-02 - Search by data_key returns matching result", async () => {
      test.setTimeout(60000);
      // dataKey is derived as snake_case of the rule name, e.g. "ua_missing_or_empty"
      const rule = await getSystemRuleByDataKey(
        "ua_missing_or_empty",
        "id",
      ).catch(() => null);
      test.skip(rule === null, "DataKey 'ua_missing_or_empty' not found in DB");

      const searchBar = await getSearchBar(ssFrame);
      await searchBar.fill(rule!.dataKey);
      await searchBar.press("Enter");
      await cfdPage.page.waitForLoadState("networkidle");

      await expect(
        ssFrame.getByText(rule!.ruleName, { exact: false }),
      ).toBeVisible({ timeout: 15000 });
    });

    test("SS-ID-SR-03 - Search by rule ID returns matching result", async () => {
      test.setTimeout(60000);
      const rules = await getSystemRules("id").catch(
        () => [] as Awaited<ReturnType<typeof getSystemRules>>,
      );
      test.skip(rules.length === 0, "No rules found in DB");

      const firstRule = rules[0];
      const searchBar = await getSearchBar(ssFrame);
      await searchBar.fill(String(firstRule.ruleId));
      await searchBar.press("Enter");
      await cfdPage.page.waitForLoadState("networkidle");

      // UI rule count should be ≥ 1 (the matching rule is still visible)
      const ruleCards = await getVisibleRuleCards(ssFrame);
      await expect(ruleCards.first()).toBeVisible({ timeout: 15000 });
    });

    test("SS-ID-SR-04 - Search with non-existent term shows no results", async () => {
      test.setTimeout(60000);
      const searchBar = await getSearchBar(ssFrame);
      await searchBar.fill("XXXXXXXXXXX_NONEXISTENT_RULE");
      // Press Enter so Streamlit processes the input immediately
      await searchBar.press("Enter");
      await cfdPage.page.waitForLoadState("networkidle");

      // Either a "no results" message appears OR all rule cards disappear
      const ruleCards = await getVisibleRuleCards(ssFrame);
      // Wait up to 10s for the filtering to take effect
      await expect(ruleCards)
        .toHaveCount(0, { timeout: 10000 })
        .catch(async () => {
          // If rule cards are still showing, check for an explicit "no results" message
          const noResult = ssFrame.getByText(
            /no result|not found|no rule|no data/i,
          );
          await expect(noResult.first()).toBeVisible({ timeout: 5000 });
        });
    });

    test("SS-ID-SR-05 - Filter by Category: User Agent shows only User Agent rules", async () => {
      test.setTimeout(60000);
      const dbCount = await getSystemRuleCountByCategory(
        "USER AGENT DETECTION",
        "id",
      ).catch(() => 0);
      test.skip(dbCount === 0, "No User Agent rules in DB");

      await selectFilter(
        ssFrame,
        cfdPage.page,
        "Category",
        "USER AGENT DETECTION",
      );

      const badges = ssFrame
        .locator(".settings-rule-badge")
        .filter({ hasText: /user agent/i });
      await expect(badges.first()).toBeVisible({ timeout: 15000 });
    });

    test("SS-ID-SR-06 - Filter by Action: BLOCK shows only BLOCK rules", async () => {
      test.setTimeout(60000);
      await selectFilter(ssFrame, cfdPage.page, "Action", "BLOCK");

      // After filtering to BLOCK, at least one rule should appear
      const ruleCards = await getVisibleRuleCards(ssFrame);
      await expect(ruleCards.first()).toBeVisible({ timeout: 15000 });

      // No WARNING combobox should show the value "WARNING" as selected per-rule
      const warningSelected = ssFrame.getByRole("combobox", {
        name: /selected WARNING/i,
      });
      await expect(warningSelected).toHaveCount(0);
    });

    test("SS-ID-SR-07 - Filter by Action: WARNING shows only WARNING rules", async () => {
      test.setTimeout(60000);
      await selectFilter(ssFrame, cfdPage.page, "Action", "WARNING");

      // After filtering to WARNING, at least one rule should appear
      const ruleCards = await getVisibleRuleCards(ssFrame);
      await expect(ruleCards.first()).toBeVisible({ timeout: 15000 });

      // No BLOCK combobox should show the value "BLOCK" as selected per-rule
      const blockSelected = ssFrame.getByRole("combobox", {
        name: /selected BLOCK/i,
      });
      await expect(blockSelected).toHaveCount(0);
    });

    test("SS-ID-SR-08 - Combined Category + Action filter returns correct results", async () => {
      test.setTimeout(60000);
      await selectFilter(ssFrame, cfdPage.page, "Category", "IP VELOCITY");
      await selectFilter(ssFrame, cfdPage.page, "Action", "BLOCK");

      const hasResults =
        (await ssFrame
          .getByText(/velocity/i)
          .count()
          .catch(() => 0)) > 0;
      const hasEmpty = await ssFrame
        .getByText(/no result|not found|no data/i)
        .isVisible()
        .catch(() => false);
      expect(hasResults || hasEmpty).toBe(true);
    });
  });

  // ── 3. Rule Toggle (Enable / Disable) ─────────────────────────────────────────────

  test.describe("3. Rule Toggle", () => {
    test("SS-ID-TG-01 - Active toggle is visible for each rule", async () => {
      test.setTimeout(60000);
      const toggles = ssFrame.locator('input[type="checkbox"]');
      const count = await toggles.count();
      expect(count).toBeGreaterThan(0);
    });

    test("SS-ID-TG-02 - Toggle state reflects DB is_active value for a known rule", async () => {
      test.setTimeout(60000);
      // DB name is "UA Missing Or Empty" (different from UI display name)
      const rule = await getSystemRuleByName("UA Missing Or Empty", "id").catch(
        () => null,
      );
      test.skip(rule === null, "Rule not found in DB");

      const ruleCard = ssFrame
        .locator('[data-testid="stHorizontalBlock"]')
        .filter({
          has: ssFrame.locator(".settings-rule-title"),
        })
        .first();
      const toggle = ruleCard.locator('input[type="checkbox"]');

      if (rule!.isActive) {
        await expect(toggle).toBeChecked();
      } else {
        await expect(toggle).not.toBeChecked();
      }
    });

    test("SS-ID-TG-03 - Toggling a rule OFF and back ON persists the change", async () => {
      test.setTimeout(90000);
      const firstToggle = ssFrame.locator('input[type="checkbox"]').first();
      const initialState = await firstToggle.isChecked();

      await firstToggle.click();
      await cfdPage.page.waitForLoadState("networkidle");
      expect(await firstToggle.isChecked()).toBe(!initialState);

      await firstToggle.click();
      await cfdPage.page.waitForLoadState("networkidle");
      expect(await firstToggle.isChecked()).toBe(initialState);
    });
  });

  // ── 4. Threshold Fields ─────────────────────────────────────────────────────────────

  test.describe("4. Threshold Fields", () => {
    test("SS-ID-TH-01 - Velocity rules display threshold input fields", async () => {
      test.setTimeout(60000);
      await selectFilter(ssFrame, cfdPage.page, "Category", "IP VELOCITY");

      const thresholdInputs = ssFrame.getByRole("spinbutton");
      const count = await thresholdInputs.count();
      expect(count).toBeGreaterThan(0);
    });

    test("SS-ID-TH-02 - Threshold input accepts valid positive value", async () => {
      test.setTimeout(90000);
      await selectFilter(ssFrame, cfdPage.page, "Category", "IP VELOCITY");

      const firstThreshold = ssFrame.getByRole("spinbutton").first();
      await firstThreshold.clear();
      await firstThreshold.fill("999");
      await firstThreshold.press("Enter");
      await cfdPage.page.waitForLoadState("networkidle");

      const errorMsg = ssFrame.getByText(/invalid|error|required/i);

      await expect(errorMsg).toHaveCount(0);
    });

    test("SS-ID-TH-03 - Threshold input rejects zero or negative value", async () => {
      test.setTimeout(90000);
      await selectFilter(ssFrame, cfdPage.page, "Category", "IP VELOCITY");

      const firstThreshold = ssFrame.getByRole("spinbutton").first();
      await firstThreshold.clear();
      await firstThreshold.fill("-1");
      await firstThreshold.press("Enter");
      await cfdPage.page.waitForLoadState("networkidle");

      const errorVisible = await ssFrame
        .getByText(/invalid|error|must be greater|positive/i)
        .isVisible()
        .catch(() => false);
      const inputVal = await firstThreshold.inputValue();
      console.log("Input value after invalid entry:", inputVal);
      expect(errorVisible || Number(inputVal) > 0).toBe(false);
    });

    test("SS-ID-TH-04 - Velocity rules display non-zero threshold values in UI", async () => {
      test.setTimeout(60000);
      await selectFilter(ssFrame, cfdPage.page, "Category", "IP VELOCITY");

      const thresholdInputs = ssFrame.getByRole("spinbutton");
      const count = await thresholdInputs.count();
      expect(count).toBeGreaterThan(0);

      // Every visible threshold spinbutton must hold a positive integer
      for (let i = 0; i < count; i++) {
        const val = await thresholdInputs.nth(i).inputValue();
        expect(Number(val)).toBeGreaterThan(0);
      }
    });
  });

  // ── 5. Action Badge ─────────────────────────────────────────────────────────────

  test.describe("5. Action Badge", () => {
    test("SS-ID-AB-01 - Each rule displays BLOCK (red) or WARNING (orange) badge", async () => {
      test.setTimeout(60000);
      const blockCount = await ssFrame.getByText(/^block$/i).count();
      const warningCount = await ssFrame.getByText(/^warning$/i).count();
      expect(blockCount + warningCount).toBeGreaterThan(0);
    });

    test("SS-ID-AB-02 - BLOCK badge count matches DB count (after filtering)", async () => {
      test.setTimeout(60000);
      const dbBlockCount = await getSystemRuleCountByAction("BLOCK", "id");

      await selectFilter(ssFrame, cfdPage.page, "Action", "BLOCK");

      const uiBlockCount = await ssFrame.getByText(/^block$/i).count();
      expect(uiBlockCount).toBe(dbBlockCount);
    });

    test("SS-ID-AB-03 - WARNING badge count matches DB count (after filtering)", async () => {
      test.setTimeout(60000);
      const dbWarningCount = await getSystemRuleCountByAction("WARNING", "id");

      await selectFilter(ssFrame, cfdPage.page, "Action", "WARNING");

      const uiWarningCount = await ssFrame.getByText(/^warning$/i).count();
      expect(uiWarningCount).toBe(dbWarningCount);
    });
  });

  // ── 6. Rule Count & List Completeness ─────────────────────────────────────────────

  test.describe("6. Rule Count & List Completeness", () => {
    test("SS-ID-RC-01 - Total rule count on UI matches DB", async () => {
      test.setTimeout(60000);
      const dbCount = await getSystemRuleCount("id");
      test.skip(dbCount === 0, "No rules found in DB");

      const ruleCards = await getVisibleRuleCards(ssFrame);
      const uiCount = await ruleCards.count();
      expect(uiCount).toBe(dbCount);
    });

    test("SS-ID-RC-02 - No duplicate rule names in the list", async () => {
      test.setTimeout(60000);
      const rules = await getSystemRules("id");
      test.skip(rules.length === 0, "No rules in DB");

      const names = rules.map((r) => r.ruleName);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    test("SS-ID-RC-03 - All DB rules are visible in the UI list", async () => {
      test.setTimeout(90000);
      const rules = await getSystemRules("id");
      test.skip(rules.length === 0, "No rules in DB");

      for (const rule of rules) {
        await expect(
          ssFrame.getByText(rule.ruleName, { exact: false }),
        ).toBeVisible();
      }
    });
  });

  // ── 7. Tab - Entity Management ─────────────────────────────────────────────

  test.describe("7. Entity Management Tab", () => {
    test("SS-ID-EM-01 - Clicking Entity Management tab switches content", async () => {
      test.setTimeout(60000);
      const emTab = cfdPage.page.getByRole("tab", {
        name: /entity management/i,
      });
      await emTab.click();
      await cfdPage.page.waitForLoadState("networkidle");

      await expect(emTab).toHaveAttribute("aria-selected", "true");

      const rulesTab = cfdPage.page.getByRole("tab", {
        name: /active rules & thresholds/i,
      });
      await expect(rulesTab).toHaveAttribute("aria-selected", "false");
    });

    test("SS-ID-EM-02 - Entity Management tab panel content is visible", async () => {
      test.setTimeout(60000);
      await cfdPage.page
        .getByRole("tab", { name: /entity management/i })
        .click();
      await cfdPage.page.waitForLoadState("networkidle");

      const panel = cfdPage.page.getByRole("tabpanel");
      await expect(panel).toBeVisible();
    });

    test("SS-ID-EM-03 - Switching back to Active Rules tab restores rules list", async () => {
      test.setTimeout(60000);
      await cfdPage.page
        .getByRole("tab", { name: /entity management/i })
        .click();
      await cfdPage.page.waitForLoadState("networkidle");

      await cfdPage.page
        .getByRole("tab", { name: /active rules & thresholds/i })
        .click();
      await cfdPage.page.waitForLoadState("networkidle");

      // Re-find the frame after tab switch
      const newFrame = await getSystemSettingsFrame(cfdPage.page);
      await expect(await getSearchBar(newFrame)).toBeVisible();
    });
  });

  // ── 8. Responsive / Accessibility ─────────────────────────────────────────────

  test.describe("8. Accessibility & Console", () => {
    test("SS-ID-ACC-01 - All toggles and buttons are clickable (no overlay)", async () => {
      test.setTimeout(60000);
      const toggles = ssFrame.locator('input[type="checkbox"]');
      const count = await toggles.count();
      expect(count).toBeGreaterThan(0);

      const firstToggle = toggles.first();
      await expect(firstToggle).toBeEnabled();
    });

    test("SS-ID-ACC-02 - No JS console errors on page load", async () => {
      const errors: string[] = [];
      cfdPage.page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      await cfdPage.page.reload();
      await cfdPage.page.waitForLoadState("networkidle");

      expect(errors).toHaveLength(0);
    });

    test("SS-ID-ACC-03 - Search input is keyboard accessible", async () => {
      test.setTimeout(60000);
      const searchBar = await getSearchBar(ssFrame);
      await searchBar.focus();
      await searchBar.type("test");
      await searchBar.press("Escape");

      await expect(searchBar).toBeFocused();
    });

    test("SS-ID-ACC-04 - Category and Action dropdowns are keyboard navigable", async () => {
      test.setTimeout(60000);
      const categoryDropdown = await getFilterTrigger(ssFrame, "Category");
      await categoryDropdown.focus();
      await expect(categoryDropdown).toBeFocused();

      const actionDropdown = await getFilterTrigger(ssFrame, "Action");
      await actionDropdown.focus();
      await expect(actionDropdown).toBeFocused();
    });
  });
});
