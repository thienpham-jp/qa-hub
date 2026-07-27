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
const VALID_CAMPAIGN_IDS = [3747, 3748, 3749, 3750];
const randomCampaignId = () =>
  VALID_CAMPAIGN_IDS[randomInt(0, VALID_CAMPAIGN_IDS.length - 1)];

const getApiUrl = (campaignId: number | null) =>
  `${baseURL}/v1/staff/campaign/${campaignId}`;

const token = `Bearer ${generateJWT(USER_UID_VN, SECRET_KEY_VN)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);
const getRestrictedAuthHeaders = () => createStaffHeaders(restrictedToken);

test.describe("Find Campaign Detail API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Find Campaign Detail API method `GET /v1/staff/campaign/{campaignId}`
   * Test summary to cover:
   *  1. Valid Campaign ID - Expect 200 OK with correct campaign detail data.
   *  2. Non-Existing Campaign ID - Expect 400 Bad Request with appropriate error message.
   *  3. Missing Campaign ID - Expect 400 Bad Request with validation error message.
   *  4. Invalid Campaign ID Format (e.g., string instead of number) - Expect 400 Bad Request with validation error message.
   *  5. Unauthorized Access (e.g., no token or invalid token) - Expect 401 Unauthorized with appropriate error message.
   *  6. Forbidden Access (e.g., user without access to the campaign's country) - Expect 401 Unauthorized with appropriate error message.
   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Valid Campaign ID - Expect 200 OK with correct campaign detail data", async ({
    request,
  }) => {
    const campaignId = 3841;
    const res = await request.get(getApiUrl(campaignId), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(body).toHaveProperty("campaignNo");
    expect(body.campaignNo).toBe(campaignId);
    expect(body).toHaveProperty("campaignName");
    expect(body).toHaveProperty("corporateName");
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
    const res = await request.get(`${baseURL}/v1/staff/campaign/`, {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not Found/i);
  });

  // ─── TC_04 ──────────────────────────────────────────────────────────────────
  test("TC_04 - Invalid Campaign ID Format (string) - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.get(`${baseURL}/v1/staff/campaign/invalid-id`, {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not Found/i);
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  test("TC_05 - Unauthorized Access (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const campaignId = randomCampaignId();
    const res = await request.get(getApiUrl(campaignId), {
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
  test("TC_06 - Forbidden Access (user without country access) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    // staff account that has no access to the campaign's country in staging DB
    const campaignId = randomCampaignId();
    const res = await request.get(getApiUrl(campaignId), {
      headers: getRestrictedAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });
});
