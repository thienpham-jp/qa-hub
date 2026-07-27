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

const getApiUrl = (partnerId: number | null) =>
  `${baseURL}/v1/staff/partners/${partnerId}/payment/request-payment-under-processing`;

const token = `Bearer ${generateJWT(USER_UID_VN, SECRET_KEY_VN)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);
const getRestrictedAuthHeaders = () => createStaffHeaders(restrictedToken);

// TODO: replace with a valid partnerId that exists in staging DB
const VALID_PARTNER_ID = 1120078;

const validPayload = () => ({ publisherPaymentHistoryIds: [4882419] });

test.describe("Request Payment Under Processing API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Request Payment Under Processing API method `POST v1/staff/partners/{partnerId}/payment/request-payment-under-processing`
   * Test summary to cover:
   * 1. Authentication failure with invalid token
   * 2. Authorization failure for restricted user
   * 3. Validation error when publisherPaymentHistoryIds is missing
   * 4. Validation error when publisherPaymentHistoryIds is empty
   * 5. Validation error when publisherPaymentHistoryIds contains invalid IDs
   * 6. Payment history does not belong to publisher with partnerId - Expect 403 Forbidden with appropriate error message
   * 7. Successful request with valid publisherPaymentHistoryIds but no matching records - Expect 404 Not Found with appropriate error message
   * 8. Some payment IDs are not in correct state - Expect 422 Unprocessable Entity with appropriate error message
   * 9. Successful request with valid publisherPaymentHistoryIds 1 item - Expect 200 OK with correct response structure
   * 9b. Successful request with valid publisherPaymentHistoryIds multiple items - Expect 200 OK with correct response structure
   * 10. Non-existing partnerId - Expect 404 Not Found with appropriate error message
   * 11. PartnerIt exists but is not in active state - Expect 403 Forbidden with appropriate error message
   * 12. More than 100 IDs in publisherPaymentHistoryIds - Expect 400 Bad Request with appropriate error message
   * 13. All IDs belong to the partner but at least one row is not in an allowed status (code allows UNPAID and PROBLEM_REPORTED; the user-facing message says “CLAIM”) - Expect 422 Unprocessable Entity with appropriate error message
   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Authentication failure (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.post(getApiUrl(VALID_PARTNER_ID), {
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
    // staff account that has no permission in staging DB
    const res = await request.post(getApiUrl(VALID_PARTNER_ID), {
      headers: getRestrictedAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_03 ──────────────────────────────────────────────────────────────────
  test("TC_03 - Missing publisherPaymentHistoryIds - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.post(getApiUrl(VALID_PARTNER_ID), {
      headers: getAuthHeaders(),
      data: {},
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(
      /publisherPaymentHistoryIds|required/i,
    );
  });

  // ─── TC_04 ──────────────────────────────────────────────────────────────────
  test("TC_04 - Empty publisherPaymentHistoryIds - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.post(getApiUrl(VALID_PARTNER_ID), {
      headers: getAuthHeaders(),
      data: { publisherPaymentHistoryIds: [] },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(
      /publisherPaymentHistoryIds|required|empty/i,
    );
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  test("TC_05 - publisherPaymentHistoryIds contains invalid IDs - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.post(getApiUrl(VALID_PARTNER_ID), {
      headers: getAuthHeaders(),
      data: { publisherPaymentHistoryIds: ["invalid", -1] },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(
      /Failed to parse request body for requesting payment under processing./i,
    );
  });

  // ─── TC_06 ──────────────────────────────────────────────────────────────────
  test("TC_06 - Payment history does not belong to publisher with partnerId - Expect 403 Forbidden with appropriate error message", async ({
    request,
  }) => {
    // state for under-processing in staging DB
    const res = await request.post(getApiUrl(VALID_PARTNER_ID), {
      headers: getAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(403);
    expect(JSON.stringify(body)).toMatch(
      /Payment history does not belong to publisher/i,
    );
  });

  // ─── TC_07 ──────────────────────────────────────────────────────────────────
  test("TC_07 - Valid IDs but no matching records - Expect 404 Not Found with appropriate error message", async ({
    request,
  }) => {
    // Use IDs that are valid numbers but have no matching payment history records
    const res = await request.post(getApiUrl(VALID_PARTNER_ID), {
      headers: getAuthHeaders(),
      data: { publisherPaymentHistoryIds: [999999999] },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Payment history not found/i);
  });

  // ─── TC_08 ──────────────────────────────────────────────────────────────────
  test("TC_08 - Some payment IDs are not in correct state - Expect 422 Unprocessable Entity with appropriate error message", async ({
    request,
  }) => {
    // Use a valid publisherPaymentHistoryId that belongs to the partner and is in the correct state in staging DB
    const res = await request.post(getApiUrl(VALID_PARTNER_ID), {
      headers: getAuthHeaders(),
      data: { publisherPaymentHistoryIds: [4520121] },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(422);
    expect(JSON.stringify(body)).toMatch(
      /Some payment IDs are not in correct state/i,
    );
  });

  // ─── TC_09 ──────────────────────────────────────────────────────────────────
  test.skip("TC_09 - Successful request with valid publisherPaymentHistoryIds 1 item - Expect 200 OK with correct response structure", async ({
    request,
  }) => {
    // Use a valid publisherPaymentHistoryId that belongs to the partner and is in the correct state in staging DB
    const res = await request.post(getApiUrl(VALID_PARTNER_ID), {
      headers: getAuthHeaders(),
      data: { publisherPaymentHistoryIds: [4870583] },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    // Additional assertions can be added here to validate the structure and content of the response body
  });

  // ─── TC_09b ──────────────────────────────────────────────────────────────────
  test.skip("TC_09b - Successful request with valid publisherPaymentHistoryIds multiple items - Expect 200 OK with correct response structure", async ({
    request,
  }) => {
    // Use multiple valid publisherPaymentHistoryIds that belong to the partner and are in the correct state in staging DB
    const res = await request.post(getApiUrl(VALID_PARTNER_ID), {
      headers: getAuthHeaders(),
      data: { publisherPaymentHistoryIds: [6608014, 4948493, 5850773] },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    // Additional assertions can be added here to validate the structure and content of the response body
  });

  // ─── TC_10 ──────────────────────────────────────────────────────────────────
  test("TC_10 - Non-existing partnerId - Expect 404 Not Found with appropriate error message", async ({
    request,
  }) => {
    const nonExistingPartnerId = 999999999;
    const res = await request.post(getApiUrl(nonExistingPartnerId), {
      headers: getAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Publisher not found/i);
  });

  // ─── TC_11 ──────────────────────────────────────────────────────────────────
  test("TC_11 - Partner exists but is not in active state - Expect 403 Forbidden with appropriate error message", async ({
    request,
  }) => {
    // Use a partnerId that exists in staging DB but is not in active state
    const inactivePartnerId = 11238;
    const res = await request.post(getApiUrl(inactivePartnerId), {
      headers: getAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(403);
    expect(JSON.stringify(body)).toMatch(/Publisher is inactive/i);
  });

  // ─── TC_12 ──────────────────────────────────────────────────────────────────
  test("TC_12 - More than 100 IDs in publisherPaymentHistoryIds - Expect 400 Bad Request with appropriate error message", async ({
    request,
  }) => {
    const payload = {
      publisherPaymentHistoryIds: Array.from({ length: 101 }, (_, i) => i + 1),
    };
    const res = await request.post(getApiUrl(VALID_PARTNER_ID), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/Exceeds maximum batch size \(100\)/i);
  });

  // ─── TC_13 ──────────────────────────────────────────────────────────────────
  test.skip("TC_13 - All IDs belong to the partner but at least one row is not in an allowed status - Expect 422 Unprocessable Entity with appropriate error message", async ({
    request,
  }) => {
    // Use a mix of valid publisherPaymentHistoryIds where at least one is in an incorrect state in staging DB
    const res = await request.post(getApiUrl(VALID_PARTNER_ID), {
      headers: getAuthHeaders(),
      data: { publisherPaymentHistoryIds: [4870583, 4520121] },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(422);
    expect(JSON.stringify(body)).toMatch(
      /Some payment IDs are invalid, not owned by user, or not in correct state/i,
    );
  });
});
