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

const confirmApiUrl = `${baseURL}/v1/staff/payment/confirm`;
const cancelApiUrl = `${baseURL}/v1/staff/payment/cancel`;

const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);
const getRestrictedAuthHeaders = () => createStaffHeaders(restrictedToken);

const validPayload = () => ({
  invoiceId: "ATID202604-4",
});

test.describe("Request Change Status Invoice to Confirm API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Request Change Status Invoice to Confirm API method `PUT v1/staff/payment/confirm`
   * Test summary to cover:
   * 1. Authentication failure with invalid token
   * 2. Authorization failure for restricted user
   * 3. Missing user type - Expect 400 Bad Request
   * 4. Empty invoiceId in request body - Expect 404 Not Found
   * 5. Not existing invoiceId in request body - Expect 404 Not Found
   * 6. Invalid invoiceId status in request body - Expect 400 Bad Request
   * 7. Valid request with correct payload and headers - Expect 200 OK
   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Authentication failure (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.put(confirmApiUrl, {
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
    const res = await request.put(confirmApiUrl, {
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
    const res = await request.put(confirmApiUrl, {
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
  test("TC_04 - Missing invoiceId in request body - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.put(confirmApiUrl, {
      headers: getAuthHeaders(),
      data: { invoiceId: null },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(
      /Not existing payment data by given invoice ID/i,
    );
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  test.skip("TC_05 - Not existing invoiceId in request body - Expect 404 Not Found (x1000)", async ({
    request,
  }) => {
    for (let i = 0; i < 1000; i++) {
      const res = await request.put(confirmApiUrl, {
        headers: getAuthHeaders(),
        data: { invoiceId: "ATID-999" },
      });
      const body = await res.json().catch(() => res.text());
      expect(res.status()).toBe(404);
      expect(JSON.stringify(body)).toMatch(
        /Not existing payment data by given invoice ID/i,
      );
    }
  });

  // ─── TC_06 ──────────────────────────────────────────────────────────────────
  test.skip("TC_06 - Invalid invoiceId status in request body - Expect 400 Bad Request (x1000)", async ({
    request,
  }) => {
    for (let i = 0; i < 1000; i++) {
      const res = await request.put(confirmApiUrl, {
        headers: getAuthHeaders(),
        data: { invoiceId: "ATID202601-2" },
      });
      const body = await res.json().catch(() => res.text());
      expect(res.status()).toBe(400);
      expect(JSON.stringify(body)).toMatch(
        /Existing payment data is not under processing by given invoice ID/i,
      );
    }
  });

  // ─── TC_07 ──────────────────────────────────────────────────────────────────
  test.skip("TC_07 - Valid request with correct payload and headers - Expect 200 OK", async ({
    request,
  }) => {
    const res = await request.put(confirmApiUrl, {
      headers: getAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
  });
});

test.describe("Request Change Status Invoice to Cancel API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Request Change Status Invoice to Cancel API method `PUT v1/staff/payment/cancel`
   * Test summary to cover:
   * 1. Authentication failure with invalid token
   * 2. Authorization failure for restricted user
   * 3. Missing user type - Expect 400 Bad Request
   * 4. Empty invoiceId in request body - Expect 404 Not Found
   * 5. Not existing invoiceId in request body - Expect 404 Not Found
   * 6. Invalid invoiceId status in request body - Expect 400 Bad Request
   * 7. Valid request with correct payload and headers - Expect 200 OK
   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Authentication failure (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.put(cancelApiUrl, {
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
    const res = await request.put(cancelApiUrl, {
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
    const res = await request.put(cancelApiUrl, {
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
  test("TC_04 - Missing invoiceId in request body - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.put(cancelApiUrl, {
      headers: getAuthHeaders(),
      data: { invoiceId: null },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(
      /Not existing payment data by given invoice ID/i,
    );
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  test("TC_05 - Not existing invoiceId in request body - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.put(cancelApiUrl, {
      headers: getAuthHeaders(),
      data: { invoiceId: "ATID-999" },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(
      /Not existing payment data by given invoice ID/i,
    );
  });

  // ─── TC_06 ──────────────────────────────────────────────────────────────────
  test.skip("TC_06 - Invalid invoiceId status in request body - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.put(cancelApiUrl, {
      headers: getAuthHeaders(),
      data: { invoiceId: "ATID202601-2" },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(
      /Existing payment data is not under processing by given invoice ID/i,
    );
  });

  // ─── TC_07 ──────────────────────────────────────────────────────────────────
  test.skip("TC_07 - Valid request with correct payload and headers - Expect 200 OK", async ({
    request,
  }) => {
    const res = await request.put(cancelApiUrl, {
      headers: getAuthHeaders(),
      data: { invoiceId: "ATID202604-2" },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
  });
});
