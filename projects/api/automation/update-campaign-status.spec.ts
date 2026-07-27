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

// Replace with a valid campaign ID that exists in the staging DB
const VALID_CAMPAIGN_IDS = [3745, 3746];
const randomCampaignId = () =>
  VALID_CAMPAIGN_IDS[randomInt(0, VALID_CAMPAIGN_IDS.length - 1)];
const NON_EXISTING_CAMPAIGN_ID = 999999999;

const getApiUrl = (campaignId: number | null) =>
  `${baseURL}/v1/staff/campaigns/${campaignId}/update-status`;

const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);
const getRestrictedAuthHeaders = () => createStaffHeaders(restrictedToken);

const CAMPAIGN_STATES = [0, 1, 2, 3, 4, 5]; // Assuming these are the valid campaign state IDs for

const STATUSES = [
  "GETTING_READY",
  "RUNNING",
  "TERMINATED",
  "PAUSED",
  "OTHER",
  "WONT_RUN",
];
/*    0: Before the service begins
      1: Running
      2: Terminated
      3: Paused
      4: Other
      5: Terminated before the service begins */

const randomStatus = () => STATUSES[randomInt(0, STATUSES.length - 1)];

const validPayload = () => ({
  campaignStatus: randomStatus(),
});

test.describe("Update Campaign Status API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Update Campaign Status API method `PUT /v1/staff/campaigns/{campaignId}/update-status`
   * Test summary to cover:
   *  1. Valid Campaign ID and Status - Expect 200 OK with updated campaign status.
   *  2. Non-Existing Campaign ID - Expect 400 Bad Request with appropriate error message.
   *  3. Missing Campaign ID - Expect 404 Not Found with validation error message.
   *  4. Invalid Campaign ID Format (e.g., string instead of number) - Expect 404 Not Found with validation error message.
   *  5. Unauthorized Access (e.g., no token or invalid token) - Expect 401 Unauthorized with appropriate error message.
   *  6. Forbidden Access (e.g., user without access to the campaign's country) - Expect 401 Unauthorized with appropriate error message.
   *  7. Valid Campaign ID with Invalid Status Value - Expect 400 Bad Request with validation error message.
   *  8. Missing Status Value - Expect 400 Bad Request with validation error message.
   *  9. Invalid Status Value Format (e.g., number instead of string) - Expect 400 Bad Request with validation error message.
   * 10. Valid Campaign ID with Status Already Set to Desired Value - Expect 400 Bad Request with appropriate error message.
   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Valid Campaign ID and Status - Expect 200 OK with updated campaign status", async ({
    request,
  }) => {
    const getPayload = () => ({
      keyword: "",
      status: -1,
      campaignIds: [],
      resultIds: [],
      categoryIds: [],
      stopType: -1,
      budgetStatus: -1,
      pointbackPermission: -1,
      selfConversion: -1,
      autoAffiliationApproval: -1,
      autoActionApproval: -1,
      createdStartDate: null,
      createdEndDate: null,
      hiddenFlag: -1,
      campaignType: -1,
      adPlatformId: -1,
      merchantIds: [],
      hasBanner: -1,
    });
    const targetIds = [7889];
    const prePayload = { ...getPayload(), campaignIds: targetIds };
    const pre = await request.post(`${baseURL}/v1/staff/campaigns`, {
      headers: getAuthHeaders(),
      data: prePayload,
    });
    const preBody = await logResponse(pre);
    expect(pre.status()).toBe(200);

    // check preBody has campaignStateId
    const preItem = Array.isArray(preBody) ? preBody[0] : preBody;
    expect(preItem).toHaveProperty("campaignStateId");
    const currentState = preItem.campaignStateId;

    // preStatus = if currentState is in CAMPAIGN_STATES = 0 => map to BEFORE THE SERVICE BEGINS, 1 => map to RUNNING, 2 => map to TERMINATED, 3 => map to PAUSED, 4 => map to OTHER, 5 => map to TERMINATED BEFORE THE SERVICE BEGINS else random campaign state from CAMPAIGN_STATES
    const preStatus = CAMPAIGN_STATES.includes(currentState)
      ? STATUSES[CAMPAIGN_STATES.indexOf(currentState)]
      : STATUSES[randomInt(0, STATUSES.length - 1)];

    console.log(`Pre-check campaign status: ${preStatus}`);

    const campaignId = 7889;
    const availableStatuses = STATUSES.filter((s) => s !== preStatus);
    const campaignStatus =
      availableStatuses[randomInt(0, availableStatuses.length - 1)];
    const payload = { campaignStatus };
    const res = await request.put(getApiUrl(campaignId), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(JSON.stringify(body)).toMatch(/1/i);
  });

  // ─── TC_02 ──────────────────────────────────────────────────────────────────
  test.skip("TC_02 - Non-Existing Campaign ID - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.put(getApiUrl(NON_EXISTING_CAMPAIGN_ID), {
      headers: getAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/does not exist/i);
  });

  // ─── TC_03 ──────────────────────────────────────────────────────────────────
  test("TC_03 - Missing Campaign ID - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.put(
      `${baseURL}/v1/staff/campaigns//update-status`,
      {
        headers: getAuthHeaders(),
        data: validPayload(),
      },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not Found/i);
  });

  // ─── TC_04 ──────────────────────────────────────────────────────────────────
  test("TC_04 - Invalid Campaign ID Format (string) - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.put(
      `${baseURL}/v1/staff/campaigns/invalid-id/update-status`,
      {
        headers: getAuthHeaders(),
        data: validPayload(),
      },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not Found/i);
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  test("TC_05 - Unauthorized Access (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const campaignId = randomCampaignId();
    const res = await request.put(getApiUrl(campaignId), {
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

  // ─── TC_06 ──────────────────────────────────────────────────────────────────
  test("TC_06 - Forbidden Access (user without country access) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    // staff account that has no access to the campaign's country in staging DB
    const campaignId = randomCampaignId();
    const res = await request.put(getApiUrl(campaignId), {
      headers: getRestrictedAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_07 ──────────────────────────────────────────────────────────────────
  test("TC_07 - Invalid Status Value - Expect 400 Bad Request", async ({
    request,
  }) => {
    const campaignId = randomCampaignId();
    const res = await request.put(getApiUrl(campaignId), {
      headers: getAuthHeaders(),
      data: { campaignStatus: "INVALID" },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/campaignStatus is invalid./i);
  });

  // ─── TC_08 ──────────────────────────────────────────────────────────────────
  test("TC_08 - Missing Status Value - Expect 400 Bad Request", async ({
    request,
  }) => {
    const campaignId = randomCampaignId();
    const res = await request.put(getApiUrl(campaignId), {
      headers: getAuthHeaders(),
      data: {},
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/campaignStatus is invalid./i);
  });

  // ─── TC_09 ──────────────────────────────────────────────────────────────────
  test("TC_09 - Invalid Status Value Format (number instead of string) - Expect 400 Bad Request", async ({
    request,
  }) => {
    const campaignId = randomCampaignId();
    const res = await request.put(getApiUrl(campaignId), {
      headers: getAuthHeaders(),
      data: { campaignStatus: 1 },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/campaignStatus is invalid./i);
  });

  // ─── TC_10 ──────────────────────────────────────────────────────────────────
  test("TC_10 - Status Already Set to Desired Value - Expect 400 Bad Request", async ({
    request,
  }) => {
    const campaignId = 3745;
    const status = "PAUSED";

    // Second call: set to PAUSED again (no-op)
    const res = await request.put(getApiUrl(campaignId), {
      headers: getAuthHeaders(),
      data: { campaignStatus: status },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(
      new RegExp(
        `Campaign id ${campaignId} is already in status ${status}`,
        "i",
      ),
    );
  });
});
