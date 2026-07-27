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

const API_URL = `${baseURL}/v1/staff/conversion/rank`;
const API_URL_2 = `${baseURL}/v1/staff/affiliations/ranks`;

const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);
const getRestrictedAuthHeaders = () => createStaffHeaders(restrictedToken);

// Replace with a valid site IDs that exists in the staging DB
const siteIDs = [102253, 42658];

const siteIDPayload = () => ({
  campaignId: 8026,
  siteId: 102253,
  from: "2025-01-01T00:00:00",
  to: "2025-01-31T23:59:59",
  rank: 5,
});

const siteIDsPayload = () => ({
  campaignId: 966,
  siteIds: siteIDs,
  newRank: 9,
  nextRank: 10,
});

test.describe("Update Conversion Rank by Site IDs API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Update Conversion Rank by Site IDs API method `PUT /v1/staff/conversion/rank` and `PUT /v1/staff/affiliations/ranks`
   * Test summary to cover:
   * 1. Authentication failure with invalid token
   * 2. Authorization failure for restricted user
   * 3. Missing user type - Expect 400 Bad Request with appropriate error message
   * 4. Single siteId via Staff Tool endpoint - Expect 200 OK
   * 5. Bulk siteIds via Affiliation endpoint - Expect 200 OK
   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Authentication failure (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: {
        "Content-Type": "application/json",
        "X-Accesstrade-User-Type": "staff",
      },
      data: siteIDPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_01.1 ──────────────────────────────────────────────────────────────────
  test("TC_01.1 - Authentication failure (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.put(API_URL_2, {
      headers: {
        "Content-Type": "application/json",
        "X-Accesstrade-User-Type": "staff",
      },
      data: siteIDPayload(),
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
    const res = await request.put(API_URL, {
      headers: getRestrictedAuthHeaders(),
      data: siteIDPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_02.1 ──────────────────────────────────────────────────────────────────
  test("TC_02.1 - Authorization failure (restricted user) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    // staff account that has no permission in staging DB
    const res = await request.put(API_URL_2, {
      headers: getRestrictedAuthHeaders(),
      data: siteIDPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_03 ──────────────────────────────────────────────────────────────────
  test("TC_03 - Missing user type - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/invalid user type:/i);
  });

  // ─── TC_03.1 ──────────────────────────────────────────────────────────────────
  test("TC_03.1 - Missing user type - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.put(API_URL_2, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/invalid user type:/i);
  });

  // ─── TC_04 ──────────────────────────────────────────────────────────────────
  // Single Site Update Payload (Staff Tool)
  // System must wrap a single siteId into siteIds:[siteId] and upload to S3
  // with type UPDATE_CONVERSION_RANK.
  test("TC_04 - Single siteId via Staff Tool endpoint - Expect 200 OK", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: { ...siteIDPayload() },
    });
    const body = await logResponse(res);
    // API accepts single siteId and wraps it into a siteIds list internally
    expect(res.status()).toBe(200);
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  // Bulk Site Update Payload (Affiliation)
  // Payload must contain multiple siteIds for sites with actual rank changes
  // and conversions in the current month.
  test("TC_05 - Bulk siteIds via Affiliation endpoint - Expect 200 OK", async ({
    request,
  }) => {
    const res = await request.put(API_URL_2, {
      headers: getAuthHeaders(),
      data: siteIDsPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
  });
});
