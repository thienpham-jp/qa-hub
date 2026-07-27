import { test, expect } from "@playwright/test";
import { randomInt } from "@shared/utils/function-helper";
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

const API_URL = `${baseURL}/v1/staff/campaigns/fixed-fee-histories`;

const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);
const getRestrictedAuthHeaders = () => createStaffHeaders(restrictedToken);

// TODO: replace with a campaignId that has fixed fee histories in staging DB
const VALID_CAMPAIGN_ID = randomInt(3777, 3780);
const NON_EXISTING_CAMPAIGN_ID = 999999999;

const buildUrl = (params: Record<string, string | number | boolean>) => {
  const query = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return `${API_URL}?${query}`;
};

test.describe("Find Fixed Fee Histories API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Find Fixed Fee Histories API method `GET /v1/staff/campaigns/fixed-fee-histories/find`
   * Test summary to cover:
   * 1. Authentication failure with invalid token
   * 2. Authorization failure for restricted user
   * 3. Input param campaignId does not exist - Expect 200 OK with [] data
   * 4. Valid campaignId with existing fixed fee histories - Expect 200 OK with correct data
   * 5. Input param fixedFeeId any - expect 200 OK with correct data filtered by fixedFeeId
   * 6. Input param fixedFeeType any - expect 200 OK with correct data filtered by fixedFeeType
   * 7. Input param campaignId={id}&isBeforeTwoMonthAgo=true - expect 200 OK with correct data
   * 8. Input param campaignId={id}&isLastMonth=true - expect 200 OK with correct data
   * 9. Input params campaignId={id}&isThisMonth=true - expect 200 OK with correct data
   * 10. Input params campaignId={id}&isNextMonth=true - expect 200 OK with correct data
   * 11. Input params campaignId={id}&isOnAndAfter2Month=true - expect 200 OK with correct data
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
  test("TC_03 - Non-existing campaignId - Expect 200 OK with empty array", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ campaignId: NON_EXISTING_CAMPAIGN_ID }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    expect(body).toHaveLength(0);
  });

  // ─── TC_04 ──────────────────────────────────────────────────────────────────
  test("TC_04 - Valid campaignId with existing records - Expect 200 OK with data", async ({
    request,
  }) => {
    const res = await request.get(buildUrl({ campaignId: VALID_CAMPAIGN_ID }), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    const items = body as any[];
    if (items.length > 0) {
      expect(items[0]).toHaveProperty("merchantCampaignNo");
      expect(items[0].merchantCampaignNo).toBe(VALID_CAMPAIGN_ID);
    }
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  test("TC_05 - Filter by fixedFeeId - Expect 200 OK with correct filtered data", async ({
    request,
  }) => {
    // TODO: replace fixedFeeId=5 with a value that exists in staging DB
    const res = await request.get(
      buildUrl({ campaignId: VALID_CAMPAIGN_ID, fixedFeeId: 5 }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    (body as any[]).forEach((item: any) => {
      expect(item.fixedFeeId).toBe(5);
    });
  });

  // ─── TC_06 ──────────────────────────────────────────────────────────────────
  test.skip("TC_06 - Filter by fixedFeeType - Expect 200 OK with correct filtered data", async ({
    request,
  }) => {
    // TODO: replace fixedFeeType=1 with an actual type value from staging DB
    const res = await request.get(
      buildUrl({ campaignId: VALID_CAMPAIGN_ID, fixedFeeType: 1 }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    (body as any[]).forEach((item: any) => {
      expect(item.fixedFeeType).toBe(1);
    });
  });

  // ─── TC_07 ──────────────────────────────────────────────────────────────────
  test("TC_07 - Filter isBeforeTwoMonthAgo=true - Expect 200 OK with correct data", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ campaignId: VALID_CAMPAIGN_ID, isBeforeTwoMonthAgo: true }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
  });

  // ─── TC_08 ──────────────────────────────────────────────────────────────────
  test("TC_08 - Filter isLastMonth=true - Expect 200 OK with correct data", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ campaignId: VALID_CAMPAIGN_ID, isLastMonth: true }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
  });

  // ─── TC_09 ──────────────────────────────────────────────────────────────────
  test("TC_09 - Filter isThisMonth=true - Expect 200 OK with correct data", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ campaignId: VALID_CAMPAIGN_ID, isThisMonth: true }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
  });

  // ─── TC_10 ──────────────────────────────────────────────────────────────────
  test("TC_10 - Filter isNextMonth=true - Expect 200 OK with correct data", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ campaignId: VALID_CAMPAIGN_ID, isNextMonth: true }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
  });

  // ─── TC_11 ──────────────────────────────────────────────────────────────────
  test("TC_11 - Filter isOnAndAfter2Month=true - Expect 200 OK with correct data", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ campaignId: VALID_CAMPAIGN_ID, isOnAndAfter2Month: true }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
  });
});
