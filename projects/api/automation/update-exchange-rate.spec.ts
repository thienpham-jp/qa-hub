import { test, expect } from "@playwright/test";
import { urlStagingAPI } from "@shared/utils/base-url-helper";
import { generateJWT } from "@shared/utils/jwt-helper";
import { USER_UID, SECRET_KEY } from "@shared/utils/user-helper";
import {
  logResponse,
  createStaffHeaders,
  RESTRICTED_USER_UID,
  RESTRICTED_SECRET_KEY,
} from "./helpers/api-test-helper";

const baseURL = urlStagingAPI("ID");

const API_URL = `${baseURL}/v1/staff/exchange-rate/current-month/update`;

const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);
const getRestrictedAuthHeaders = () => createStaffHeaders(restrictedToken);

// Replace with valid campaign IDs that exist in the staging DB
const VALID_CAMPAIGN_IDS = [7995, 7911, 7860, 7737];
const NON_EXISTING_CAMPAIGN_ID = 999999999;

const exchangeRatePayload = () => ({
  currency: "CNY",
  targetMonth: "2026-07",
  rate: 2400,
  quoteCurrency: "IDR",
  campaignIds: VALID_CAMPAIGN_IDS,
});

test.describe.skip("Update Exchange Rate API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Update Exchange Rate API method `POST /v1/staff/exchange-rate/current-month/update`
   * Test summary to cover:
   * 1. Authentication failure (no token) - Expect 401 Unauthorized
   * 2. Authorization failure for restricted user - Expect 401 Unauthorized
   * 3. Missing currency in request body - Expect 404 Not Found
   * 4. Missing quoteCurrency in request body - Expect 404 Not Found
   * 5. Missing targetMonth in request body - Expect 404 Not Found
   * 6. Invalid targetMonth format (not YYYY-MM) - Expect 404 Not Found
   * 7. rate is null - Expect 404 Not Found
   * 8. rate is zero or negative - Expect 404 Not Found
   * 9. rate is non-numeric - Expect 404 Not Found
   * 10. currency equals quoteCurrency - Expect 404 Not Found
   * 11. campaignIds contains a non-existing campaign ID - Expect 404 Not Found
   * 12. campaignIds is an empty array - Expect 200 OK
   * 13. Valid request with correct payload and headers - Expect 200 OK
   * 14. User has no permissions to change exchange rate - Expect 403 Forbidden
   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Authentication failure (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: {
        "Content-Type": "application/json",
        "X-Accesstrade-User-Type": "staff",
      },
      data: exchangeRatePayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_02 ──────────────────────────────────────────────────────────────────
  test("TC_02 - Authorization failure (restricted user) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    // staff account that has no permission in staging DB
    const res = await request.post(API_URL, {
      headers: getRestrictedAuthHeaders(),
      data: exchangeRatePayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_03 ──────────────────────────────────────────────────────────────────
  test("TC_03 - Missing currency in request body - Expect 404 Not Found", async ({
    request,
  }) => {
    const { currency, ...payload } = exchangeRatePayload();
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not Found/i);
  });

  // ─── TC_04 ──────────────────────────────────────────────────────────────────
  test("TC_04 - Missing quoteCurrency in request body - Expect 404 Not Found", async ({
    request,
  }) => {
    const { quoteCurrency, ...payload } = exchangeRatePayload();
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not Found/i);
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  test.skip("TC_05 - Missing targetMonth in request body - Expect 404 Not Found", async ({
    request,
  }) => {
    const { targetMonth, ...payload } = exchangeRatePayload();
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not Found/i);
  });

  // ─── TC_06 ──────────────────────────────────────────────────────────────────
  test.skip("TC_06 - Invalid targetMonth format (not YYYY-MM) - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: { ...exchangeRatePayload(), targetMonth: "07/2026" },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not Found/i);
  });

  // ─── TC_07 ──────────────────────────────────────────────────────────────────
  test("TC_07 - rate is null - Expect 404 Not Found", async ({ request }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: { ...exchangeRatePayload(), rate: null },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not Found/i);
  });

  // ─── TC_08 ──────────────────────────────────────────────────────────────────
  test("TC_08 - rate is zero or negative - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: { ...exchangeRatePayload(), rate: -100 },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not Found/i);
  });

  // ─── TC_09 ──────────────────────────────────────────────────────────────────
  test.skip("TC_09 - rate is non-numeric - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: { ...exchangeRatePayload(), rate: "abc" },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not Found/i);
  });

  // ─── TC_10 ──────────────────────────────────────────────────────────────────
  test("TC_10 - currency equals quoteCurrency - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: { ...exchangeRatePayload(), currency: "IDR", quoteCurrency: "IDR" },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not Found/i);
  });

  // ─── TC_11 ──────────────────────────────────────────────────────────────────
  test("TC_11 - campaignIds contains a non-existing campaign ID - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: {
        ...exchangeRatePayload(),
        campaignIds: [NON_EXISTING_CAMPAIGN_ID],
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not Found/i);
  });

  // ─── TC_12 ──────────────────────────────────────────────────────────────────
  test.skip("TC_12 - campaignIds is an empty array - Expect 200 OK", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: { ...exchangeRatePayload(), campaignIds: [] },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
  });

  // ─── TC_13 ──────────────────────────────────────────────────────────────────
  test.skip("TC_13 - Valid request with correct payload - Expect 200 OK", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: exchangeRatePayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
  });

  // ─── TC_14 ──────────────────────────────────────────────────────────────────
  test.skip("TC_14 - User has no permissions change exchange rate - Expect 403 Forbidden", async ({
    request,
  }) => {
    const testToken = `Bearer ${generateJWT("llt5mq1tpatmvap4ta91aqaaaalx9440", "511ec2zzzzbz0ezs1jz4jbbjs0bxls22")}`;

    const res = await request.post(API_URL, {
      headers: { ...getAuthHeaders(), Authorization: testToken },
      data: exchangeRatePayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(403);
    expect(JSON.stringify(body)).toMatch(/You don't have permission/i);
  });
});
