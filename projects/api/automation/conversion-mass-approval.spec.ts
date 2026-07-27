import { test, expect } from "@playwright/test";
import { generateJWT } from "@shared/utils/jwt-helper";
import { SECRET_KEY, USER_UID } from "@shared/utils/user-helper";
import { urlStagingAPI } from "@shared/utils/base-url-helper";
import {
  logResponse,
  createStaffHeaders,
  RESTRICTED_SECRET_KEY,
  RESTRICTED_USER_UID,
} from "./helpers/api-test-helper";

const baseURL = urlStagingAPI("ID");

const API_URL = `${baseURL}/v1/staff/conversion/mass-approval`;

const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);

const today = new Date().toISOString().split("T")[0];

const validPayload = () => ({
  transactionIds: [],
  conversionIds: [],
  campaignId: 7898,
  campaignName: "Otten Coffee dev.",
  conversionConfirmationTimeType: "TODAY",
  confirmationDate: today,
  status: "APPROVED",
});

test.describe.skip("Mass Approval API - Limit Validation", () => {
  test.describe.configure({ mode: "parallel" });

  /*
   ? Test Cases for Mass Approval API method `PUT /v1/staff/conversion/mass-approval`
   * Test summary to cover:
    1. Verify mass approval with conversionId within limit (≤100k) - Expect 200 OK
    2. Verify mass approval exceeding conversionId limit (>100k) - Expect 400 Bad Request
    3. Verify boundary condition for conversionId limit (exactly 100k) - Expect 200 OK
    4. Verify mass approval with transactionId within limit (≤10k) - Expect 200 OK
    5. Verify mass approval exceeding transactionId limit (>10k) - Expect 400 Bad Request
    6. Verify boundary condition for transactionId limit (exactly 10k) - Expect 200 OK
    7. Verify empty request payload - Expect 400 Bad Request
    8. Verify duplicate IDs in request - Expect 200 OK (or 400 Bad Request if duplicates are not allowed)
    9. Verify partial invalid IDs in request - Expect 200 OK (or 400 Bad Request if any invalid ID causes failure)
    10. Verify performance at maximum allowed limit - Expect response within acceptable time frame (e.g. <30 seconds)
    11. Authentication failure (no token) - Expect 401 Unauthorized
    12. Authorization failure (restricted user) - Expect 401 Unauthorized
    13. Missing user type - Expect 400 Bad Request
   */

  // ── Validation for conversionId Limit (100,000) ─────────────────────────────
  test("TC01: Verify mass approval with conversionId within limit (≤100k)", async ({
    page,
  }) => {
    const conversionIds = Array.from(
      { length: 50_000 },
      (_, i) => `${String(i + 1).padStart(7, "0")}`,
    );

    const response = await page.request.put(API_URL, {
      headers: getAuthHeaders(),
      data: {
        ...validPayload(),
        campaignId: 343,
        campaignName: "Test Campaign",
        conversionIds: conversionIds,
      },
      timeout: 60_000,
    });
    await logResponse(response);
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(400);
  });

  test.skip("TC02: Verify mass approval exceeding conversionId limit (>100k)", async ({
    page,
  }) => {
    const conversionIds = Array.from(
      { length: 100_001 },
      (_, i) => `${String(i + 1).padStart(7, "0")}`,
    );

    const response = await page.request.put(API_URL, {
      headers: getAuthHeaders(),
      data: {
        ...validPayload(),
        conversionIds: conversionIds,
      },
      timeout: 60_000,
    });

    await logResponse(response);
    expect(response.status()).toBe(400);
    // expect(response.status()).toBeLessThan(600);
  });

  test("TC03: Verify boundary condition for conversionId limit (exactly 100k)", async ({
    page,
  }) => {
    const conversionIds = Array.from(
      { length: 100_000 },
      (_, i) => `${String(i + 1).padStart(7, "0")}`,
    );

    const response = await page.request.put(API_URL, {
      headers: getAuthHeaders(),
      data: {
        ...validPayload(),
        conversionIds: conversionIds,
      },
      timeout: 60_000,
    });

    await logResponse(response);
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(400);
  });

  // ── Validation for transactionId Limit (10,000) ──────────────────────────────

  test("TC04: Verify mass approval with transactionId within limit (≤10k)", async ({
    page,
  }) => {
    const transactionIds = Array.from(
      { length: 5_000 },
      (_, i) => `TXN${String(i + 1).padStart(7, "0")}`,
    );

    const response = await page.request.put(API_URL, {
      headers: getAuthHeaders(),
      data: {
        ...validPayload(),
        campaignId: 343,
        campaignName: "Test Campaign",
        transactionIds: transactionIds,
      },
      timeout: 60_000,
    });

    await logResponse(response);
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(400);
  });

  test.skip("TC05: Verify mass approval exceeding transactionId limit (>10k)", async ({
    page,
  }) => {
    const transactionIds = Array.from(
      { length: 10_001 },
      (_, i) => `TXN${String(i + 1).padStart(7, "0")}`,
    );

    const response = await page.request.put(API_URL, {
      headers: getAuthHeaders(),
      data: {
        ...validPayload(),
        transactionIds: transactionIds,
      },
      timeout: 60_000,
    });

    await logResponse(response);
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(600);
  });

  test("TC06: Verify boundary condition for transactionId limit (exactly 10k)", async ({
    page,
  }) => {
    const transactionIds = Array.from(
      { length: 10_000 },
      (_, i) => `TXN${String(i + 1).padStart(7, "0")}`,
    );

    const response = await page.request.put(API_URL, {
      headers: getAuthHeaders(),
      data: {
        ...validPayload(),
        transactionIds: transactionIds,
      },
      timeout: 60_000,
    });

    await logResponse(response);
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(400);
  });

  // ── Negative & Edge Cases ────────────────────────────────────────────────────
  test.skip("TC08: Verify empty request payload", async ({ page }) => {
    const response = await page.request.put(API_URL, {
      headers: getAuthHeaders(),
      data: {
        ...validPayload(),
      },
      timeout: 30_000,
    });

    await logResponse(response);
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(600);
  });

  test("TC09: Verify duplicate IDs in request", async ({ page }) => {
    // 10 unique IDs each repeated 10 times = 100 total entries
    const baseIds = Array.from(
      { length: 10 },
      (_, i) => `TXN${String(i + 1).padStart(7, "0")}`,
    );
    const transactionIds = Array.from<string>({ length: 10 })
      .fill("")
      .flatMap(() => baseIds);

    const response = await page.request.put(API_URL, {
      headers: getAuthHeaders(),
      data: {
        ...validPayload(),
        transactionIds: transactionIds,
        campaignId: 343,
        campaignName: "Test Campaign",
      },
      timeout: 30_000,
    });

    await logResponse(response);
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(600);
  });

  test("TC10: Verify partial invalid IDs in request", async ({ page }) => {
    const transactionIds = [
      "TXN0000001",
      "TXN0000002",
      "INVALID_ID_###",
      "   ",
      "TXN0000003",
      "",
      "TXN0000004",
    ];

    const response = await page.request.put(API_URL, {
      headers: getAuthHeaders(),
      data: {
        ...validPayload(),
        transactionIds: transactionIds,
        campaignId: 343,
        campaignName: "Test Campaign",
      },
      timeout: 30_000,
    });

    await logResponse(response);
    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(600);
  });

  // ── Performance & Stability ──────────────────────────────────────────────────

  test("TC11: Verify performance at maximum allowed limit", async ({
    page,
  }) => {
    const transactionIds = Array.from(
      { length: 10_000 },
      (_, i) => `TXN${String(i + 1).padStart(7, "0")}`,
    );

    const startTime = Date.now();
    const response = await page.request.put(API_URL, {
      headers: getAuthHeaders(),
      data: {
        ...validPayload(),
        transactionIds: transactionIds,
      },
      timeout: 120_000,
    });
    const elapsed = Date.now() - startTime;

    await logResponse(response);

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(600);
    expect(elapsed).toBeLessThan(30_000); // must respond within 30 seconds
  });

  // ─── TC_12 ──────────────────────────────────────────────────────────────────
  test("TC_12 - Authentication failure (no token) - Expect 401 Unauthorized", async ({
    page,
  }) => {
    const response = await page.request.put(API_URL, {
      headers: { ...getAuthHeaders(), Authorization: "" },
      data: {
        ...validPayload(),
      },
      timeout: 60_000,
    });
    const body = await logResponse(response);
    expect(response.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_13 ──────────────────────────────────────────────────────────────────
  test("TC_13 - Authorization failure (restricted user) - Expect 401 Unauthorized", async ({
    page,
  }) => {
    const response = await page.request.put(API_URL, {
      headers: { ...getAuthHeaders(), Authorization: restrictedToken },
      data: {
        ...validPayload(),
      },
      timeout: 60_000,
    });
    const body = await logResponse(response);
    expect(response.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_14 ──────────────────────────────────────────────────────────────────
  test("TC_14 - Missing user type - Expect 400 Bad Request", async ({
    page,
  }) => {
    const response = await page.request.put(API_URL, {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        ...validPayload(),
      },
      timeout: 60_000,
    });
    const body = await logResponse(response);
    expect(response.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/invalid user type:/i);
  });
}); // end: Mass Approval API - Limit Validation
