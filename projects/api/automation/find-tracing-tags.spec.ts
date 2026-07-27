import { test, expect } from "@playwright/test";
import { urlStagingAPI } from "@shared/utils/base-url-helper";
import { generateJWT } from "@shared/utils/jwt-helper";
import { randomInt } from "@shared/utils/function-helper";
import { USER_UID_VN, SECRET_KEY_VN } from "@shared/utils/user-helper";
import {
  logResponse,
  createStaffHeaders,
  RESTRICTED_USER_UID,
  RESTRICTED_SECRET_KEY,
} from "./helpers/api-test-helper";

const baseURL = urlStagingAPI("VN");

const NON_EXISTING_CAMPAIGN_ID = 999999999;

// Replace with a valid campaign ID that exists in the staging DB
const VALID_CAMPAIGN_IDS = [3745, 3746, 3747, 3748, 3749, 3750];
const randomCampaignId = () =>
  VALID_CAMPAIGN_IDS[randomInt(0, VALID_CAMPAIGN_IDS.length - 1)];

const getApiUrl = (campaignId: number | null) =>
  `${baseURL}/v1/staff/campaigns/tracking-tags?campaignId=${campaignId}`;

const token = `Bearer ${generateJWT(USER_UID_VN, SECRET_KEY_VN)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);
const getRestrictedAuthHeaders = () => createStaffHeaders(restrictedToken);

test.describe("Find Tracing Tags API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Find Tracing Tags API method `GET v1/staff/campaigns/tracking-tags?campaignId={campaignId}`
   * Test summary to cover:
   *  1. Valid Campaign ID - Expect 200 OK with correct tracing tags data.
   *  2. Non-Existing Campaign ID - Expect 400 Bad Request with appropriate error message.
   *  3. Missing Campaign ID - Expect 404 Not Found with validation error message.
   *  4. Invalid Campaign ID Format (e.g., string instead of number) - Expect 404 Not Found with validation error message.
   *  5. Unauthorized Access (e.g., no token or invalid token) - Expect 401 Unauthorized with appropriate error message.
   *  6. Forbidden Access (e.g., user without access to the campaign's country) - Expect 401 Unauthorized with appropriate error message.
   *  7. Valid Campaign ID with No Tracing Tags - Expect 200 OK with empty tracing tags arrays.
   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Valid Campaign ID - Expect 200 OK with correct tracing tags data", async ({
    request,
  }) => {
    const campaignId = randomCampaignId();
    const res = await request.get(getApiUrl(campaignId), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(body).toHaveProperty("productIndividualTags");
    expect(body).toHaveProperty("leadTags");
    expect(body).toHaveProperty("salesTags");
  });

  // ─── TC_02 ──────────────────────────────────────────────────────────────────
  test("TC_02 - Non-Existing Campaign ID - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.get(getApiUrl(NON_EXISTING_CAMPAIGN_ID), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/does not exist/i);
  });

  // ─── TC_03 ──────────────────────────────────────────────────────────────────
  test("TC_03 - Missing Campaign ID - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.get(
      `${baseURL}/v1/staff/campaigns/tracking-tags`,
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/campaignId is required/i);
  });

  // ─── TC_04 ──────────────────────────────────────────────────────────────────
  test("TC_04 - Invalid Campaign ID Format (string) - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.get(
      `${baseURL}/v1/staff/campaigns/tracking-tags?campaignId=invalid-id`,
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/campaignId is required/i);
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  test("TC_05 - Unauthorized Access (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.get(getApiUrl(randomCampaignId()), {
      headers: {
        "Content-Type": "application/json",
        "X-Accesstrade-User-Type": "staff",
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_06 ──────────────────────────────────────────────────────────────────
  test("TC_06 - Forbidden Access (user without country access) - Expect 403 Forbidden", async ({
    request,
  }) => {
    // staff account that has no access to the campaign's country in staging DB
    const res = await request.get(getApiUrl(randomCampaignId()), {
      headers: getRestrictedAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_07 ──────────────────────────────────────────────────────────────────
  test("TC_07 - Valid Campaign ID with No Tracing Tags - Expect 200 OK with empty tracing tags arrays", async ({
    request,
  }) => {
    // Use a campaign ID that is known to have no tracing tags in the staging DB
    const campaignIdWithNoTags = 3750; // Replace with actual campaign ID if needed
    const res = await request.get(getApiUrl(campaignIdWithNoTags), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(body).toHaveProperty("productIndividualTags");
    expect(body).toHaveProperty("leadTags");
    expect(body).toHaveProperty("salesTags");
  });
});
