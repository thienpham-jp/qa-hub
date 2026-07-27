import { test, expect } from "@playwright/test";
import { urlStagingAPI } from "@shared/utils/base-url-helper";
import { generateJWT } from "@shared/utils/jwt-helper";
import { USER_UID_VN, SECRET_KEY_VN } from "@shared/utils/user-helper";
import {
  logResponse,
  createStaffHeaders,
  RESTRICTED_USER_UID,
  RESTRICTED_SECRET_KEY,
} from "./helpers/api-test-helper";

const baseURL = urlStagingAPI("VN");

const getApiUrl = `${baseURL}/v1/staff/payment/request-invoice`;

const token = `Bearer ${generateJWT(USER_UID_VN, SECRET_KEY_VN)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);
const getRestrictedAuthHeaders = () => createStaffHeaders(restrictedToken);

const validPayload = () => ({
  paymentIds: [4848446],
  publisherId: 1077523,
});

test.describe("Request Payment Invoice API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Request Payment Invoice API method `POST v1/staff/payment/request-invoice`
   * Test summary to cover:
   * 1. Authentication failure with invalid token
   * 2. Authorization failure for restricted user
   * 3. Missing user type - Expect 400 Bad Request
   * 4. Missing publisherPaymentHistoryIds in request body - Expect 404 Not Found
   * 5. Empty publisherPaymentHistoryIds array - Expect 404 Not Found
   * 6. Valid request with correct payload and headers - Expect 200 OK
   * 7. Duplicate concurrent requests with same payload - Expect one 200 OK and one 404 Not Found
   * 8. Duplicate concurrent requests with different payloads - Expect both 200 OK
   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Authentication failure (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.post(getApiUrl, {
      headers: {
        "Content-Type": "application/json",
        "X-Accesstrade-User-Type": "staff",
      },
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_02 ──────────────────────────────────────────────────────────────────
  test("TC_02 - Authorization failure (restricted user) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.post(getApiUrl, {
      headers: getRestrictedAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_03 ──────────────────────────────────────────────────────────────────
  test("TC_03 - Missing X-Accesstrade-User-Type header - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.post(getApiUrl, {
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
  });

  // ─── TC_04 ──────────────────────────────────────────────────────────────────
  test("TC_04 - Missing paymentIds in request body - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.post(getApiUrl, {
      headers: getAuthHeaders(),
      data: { publisherId: 2196724 },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(
      /Not existing payment data by given request/i,
    );
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  test("TC_05 - Empty paymentIds array - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.post(getApiUrl, {
      headers: getAuthHeaders(),
      data: { paymentIds: [], publisherId: 2196724 },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(
      /Not existing payment data by given request/i,
    );
  });

  // ─── TC_06 ──────────────────────────────────────────────────────────────────
  test.skip("TC_06 - Valid request with correct payload - Expect 200 OK", async ({
    request,
  }) => {
    const res = await request.post(getApiUrl, {
      headers: getAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
  });

  test.skip("TC_07 - Duplicate request same body - Expect 200 OK, 404 Not Found", async ({
    request,
  }) => {
    const payload = validPayload();

    const [res1, res2] = await Promise.all([
      request.post(getApiUrl, { headers: getAuthHeaders(), data: payload }),
      request.post(getApiUrl, { headers: getAuthHeaders(), data: payload }),
    ]);

    const [body1, body2] = await Promise.all([
      logResponse(res1),
      logResponse(res2),
    ]);

    const statuses = [res1.status(), res2.status()].sort();
    expect(statuses).toEqual([200, 404]);
  });

  test.skip("TC_08 - Duplicate request different body - Expect both 200 OK", async ({
    request,
  }) => {
    const payload1 = { paymentIds: [8411460], publisherId: 915332 };
    const payload2 = { paymentIds: [8411461], publisherId: 11591 };

    const [res1, res2] = await Promise.all([
      request.post(getApiUrl, { headers: getAuthHeaders(), data: payload1 }),
      request.post(getApiUrl, { headers: getAuthHeaders(), data: payload2 }),
    ]);

    const [body1, body2] = await Promise.all([
      logResponse(res1),
      logResponse(res2),
    ]);

    expect(res1.status()).toBe(200);
    expect(res2.status()).toBe(200);
  });
});
