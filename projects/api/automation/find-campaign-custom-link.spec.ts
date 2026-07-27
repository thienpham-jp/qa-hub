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
  `${baseURL}/v1/staff/global/campaign/custom-link-rules?campaignId=${campaignId}`;

const token = `Bearer ${generateJWT(USER_UID_VN, SECRET_KEY_VN)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);
const getRestrictedAuthHeaders = () => createStaffHeaders(restrictedToken);

test.describe("Find Custom Link Rules API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Find Custom Link Rules API method `GET v1/staff/global/campaign/custom-link-rules?campaignId={campaignId}`
   *
| **ID** | **Title Summary**                                                                        | **Expected Result**                                                                                   | **Actual Result** | **Status** |
| ------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------- | ---------- |
| TC_01  | Valid Campaign ID                                                                        | `200 OK` with correct custom link rules data in response body                                         |                   | ⬜ Pending  |
| TC_02  | Non-Existing Campaign ID (`999999999`)                                                   | `404 Not Found` with appropriate error message                                                        |                   | ⬜ Pending  |
| TC_03  | Missing Campaign ID (no `campaignId` query param)                                        | `400 Bad Request` with validation error message                                                       |                   | ⬜ Pending  |
| TC_04  | Invalid Campaign ID Format (string `invalid-id` instead of number)                      | `400 Bad Request` with validation error message                                                       |                   | ⬜ Pending  |
| TC_05  | Unauthorized Access — no token provided                                                  | `401 Unauthorized` with appropriate error message                                                     |                   | ⬜ Pending  |
| TC_06  | Forbidden Access — user without access to the campaign's country                         | `401 Unauthorized` with appropriate error message                                                     |                   | ⬜ Pending  |

   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Valid Campaign ID - Expect 200 OK with correct custom link rules data", async ({
    request,
  }) => {
    const res = await request.get(getApiUrl(3841), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    // Additional assertions can be added here to validate the structure and content of the custom link rules data
  });

  // ─── TC_02 ──────────────────────────────────────────────────────────────────
  test.skip("TC_02 - Non-Existing Campaign ID - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.get(getApiUrl(NON_EXISTING_CAMPAIGN_ID), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not Found/i);
  });

  // ─── TC_03 ──────────────────────────────────────────────────────────────────
  test("TC_03 - Missing Campaign ID - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.get(
      `${baseURL}/v1/staff/global/campaign/custom-link-rules`,
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/The campaign id is not valid/i);
  });

  // ─── TC_04 ──────────────────────────────────────────────────────────────────
  test("TC_04 - Invalid Campaign ID Format (string) - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.get(
      `${baseURL}/v1/staff/global/campaign/custom-link-rules?campaignId=invalid-id`,
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/The campaign id is not valid/i);
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
  test("TC_06 - Forbidden Access (user without access to the campaign's country) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const campaignId = randomCampaignId();
    const res = await request.get(getApiUrl(campaignId), {
      headers: getRestrictedAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });
});
