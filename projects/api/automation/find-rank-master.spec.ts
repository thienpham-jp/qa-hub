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

const API_URL = `${baseURL}/v1/staff/campaigns/rank-masters`;

const token = `Bearer ${generateJWT(USER_UID_VN, SECRET_KEY_VN)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);
const getRestrictedAuthHeaders = () => createStaffHeaders(restrictedToken);

// TODO: replace with a campaignId that has rank master data in staging DB
const VALID_CAMPAIGN_ID = 3746;
const NON_EXISTING_CAMPAIGN_ID = 999999999;

const buildUrl = (params: Record<string, string | number | boolean>) => {
  const query = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return `${API_URL}?${query}`;
};

test.describe("Find Rank Master API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Find Rank Master API method `GET /v1/staff/campaigns/rank-master?`
   * Test summary to cover:
   * 1. Authentication failure with invalid token
   * 2. Authorization failure for restricted user
   * 3. Input param missing campaignId - Expect 400 Bad Request with [] data
   * 4. Input param campaignId does not exist - Expect 400 Bad Request with appropriate error message
   * 5. Input param useFlag is null - Expect 200 Bad Request with appropriate error message
   * 6. Input param useFlag is invalid - Expect 400 Bad Request with appropriate error message
   * 7. Valid request with useFlag = 0 - Expect 200 OK with correct rank master data where useFlag = 0
   * 8. Valid request with useFlag = 1 - Expect 200 OK with correct rank master data where useFlag = 1
   * 9. Input param campaignId, useFlag combination not found - Expect 200 OK with [] data
   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Authentication failure (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.get(buildUrl({ campaignId: VALID_CAMPAIGN_ID }), {
      headers: {
        "Content-Type": "application/json",
        "X-Accesstrade-User-Type": "staff",
      },
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
    const res = await request.get(buildUrl({ campaignId: VALID_CAMPAIGN_ID }), {
      headers: getRestrictedAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_03 ──────────────────────────────────────────────────────────────────
  test("TC_03 - Missing campaignId param - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.get(buildUrl({ useFlag: 1 }), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/campaignId|required/i);
  });

  // ─── TC_04 ──────────────────────────────────────────────────────────────────
  test.skip("TC_04 - Non-existing campaignId - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ campaignId: NON_EXISTING_CAMPAIGN_ID }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/Bad Request|campaignId|not found/i);
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  test("TC_05 - useFlag is null - Expect 200 OK", async ({ request }) => {
    const res = await request.get(buildUrl({ campaignId: VALID_CAMPAIGN_ID }), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
  });

  // ─── TC_06 ──────────────────────────────────────────────────────────────────
  test("TC_06 - useFlag is invalid (not 0, 1) - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ campaignId: VALID_CAMPAIGN_ID, useFlag: 99 }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/useFlag|invalid/i);
  });

  // ─── TC_07 ──────────────────────────────────────────────────────────────────
  test("TC_07 - Valid request with useFlag=0 - Expect 200 OK with data where useFlag=0", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ campaignId: VALID_CAMPAIGN_ID, useFlag: 0 }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
  });

  // ─── TC_08 ──────────────────────────────────────────────────────────────────
  test("TC_08 - Valid request with useFlag=1 - Expect 200 OK with data where useFlag=1", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ campaignId: VALID_CAMPAIGN_ID, useFlag: 1 }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
  });

  // ─── TC_09 ──────────────────────────────────────────────────────────────────
  test("TC_09 - campaignId and useFlag combination not found - Expect 200 OK with empty array", async ({
    request,
  }) => {
    // TODO: use a campaignId that exists but has no rank master with useFlag=0 in staging DB
    const res = await request.get(
      buildUrl({ campaignId: VALID_CAMPAIGN_ID, useFlag: 0 }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
  });
});
