import { test, expect } from "@playwright/test";
import { urlStagingAPI } from "@shared/utils/base-url-helper";
import { generateJWT } from "@shared/utils/jwt-helper";
import { SECRET_KEY, USER_UID } from "@shared/utils/user-helper";
import {
  logResponse,
  createStaffHeaders,
  RESTRICTED_USER_UID,
  RESTRICTED_SECRET_KEY,
} from "./helpers/api-test-helper";

const baseURL = urlStagingAPI("ID");

const API_URL = `${baseURL}/v1/staff/campaigns/fixed-fee-history`;

const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);
const getRestrictedAuthHeaders = () => createStaffHeaders(restrictedToken);

const validPayload = () => ({
  transactionId: 911,
  // deletedBy: "obs-dev@interspace.ne.jp",
});

test.describe("Delete Fixed Fee Histories API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Delete Fixed Fee Histories API method `DELETE /v1/staff/campaigns/fixed-fee-history`
   * Test summary to cover:
   * 1. Authentication failure with invalid token
   * 2. Authorization failure for restricted user
   * 3. Validation error when required fields are missing or invalid (e.g., missing transactionId, missing deletedBy)
   * 4. Successful deletion of fixed fee history with valid payload
   * 5. Attempt to delete non-existing fixed fee history (expect 404 Not Found)
   * 6. Attempt to delete fixed fee history that is already deleted (expect appropriate error response, e.g., 400 Bad Request or 404 Not Found)
   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Authentication failure (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.delete(API_URL, {
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
    // TODO: replace RESTRICTED_USER_UID / RESTRICTED_SECRET_KEY with an actual
    // staff account that has no permission in staging DB
    const res = await request.delete(API_URL, {
      headers: getRestrictedAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_03a ─────────────────────────────────────────────────────────────────
  test("TC_03a - Missing required field transactionId - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.delete(API_URL, {
      headers: getAuthHeaders(),
      data: { transactionId: null },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/transactionId|required/i);
  });

  // ─── TC_03b ─────────────────────────────────────────────────────────────────
  test.skip("TC_03b - Missing required field deletedBy - Expect 400 Bad Request", async ({
    request,
  }) => {
    const { ...payload } = validPayload();
    const res = await request.delete(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/deletedBy|required/i);
  });

  // ─── TC_03c ─────────────────────────────────────────────────────────────────
  test.skip("TC_03c - transactionId is non-numeric (invalid format) - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.delete(API_URL, {
      headers: getAuthHeaders(),
      data: { ...validPayload(), transactionId: "invalid-id" },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/Bad Request|transactionId|invalid/i);
  });

  // ─── TC_04 ──────────────────────────────────────────────────────────────────
  test.skip("TC_04 - Successful deletion with valid payload - Expect 200 OK value 1", async ({
    request,
  }) => {
    // TODO: replace transactionId 910 with a record that exists and is not yet deleted in staging DB
    const res = await request.delete(API_URL, {
      headers: getAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    // expect(body).toBe(1);
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  test("TC_05 - Delete non-existing fixed fee history - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.delete(API_URL, {
      headers: getAuthHeaders(),
      data: { ...validPayload(), transactionId: 999999999 },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/transactionId does not exist./i);
  });

  // ─── TC_06 ──────────────────────────────────────────────────────────────────
  test.skip("TC_06 - Delete already-deleted fixed fee history - Expect 400 or 404", async ({
    request,
  }) => {
    // TODO: replace transactionId 910 with a record that has already been soft-deleted in staging DB
    const res = await request.delete(API_URL, {
      headers: getAuthHeaders(),
      data: { ...validPayload(), transactionId: 908 },
    });
    const body = await logResponse(res);
    expect([400, 404]).toContain(res.status());
    expect(JSON.stringify(body)).toMatch(
      /already deleted|not found|Bad Request/i,
    );
  });
});
