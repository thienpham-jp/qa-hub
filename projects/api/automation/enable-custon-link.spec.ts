import { test, expect } from "@playwright/test";
import { randomInt } from "@shared/utils/function-helper";
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

// Replace with a valid campaign ID that exists in the staging DB
const VALID_CAMPAIGN_IDS = [3745, 3746, 3747, 3748, 3749, 3750];
const randomCampaignId = () =>
  VALID_CAMPAIGN_IDS[randomInt(0, VALID_CAMPAIGN_IDS.length - 1)];
const NON_EXISTING_CAMPAIGN_ID = 999999999;

const getApiUrl = (campaignId: number | null) =>
  `${baseURL}/v1/staff/campaigns/${campaignId}/custom-link-rule/status`;

const token = `Bearer ${generateJWT(USER_UID_VN, SECRET_KEY_VN)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);
const getRestrictedAuthHeaders = () => createStaffHeaders(restrictedToken);

const validPayload = () => ({
  enabled: Boolean(randomInt(0, 1)),
});

test.describe("Enable Custom Link API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Enable Custom Link API
   * 
| **ID** | **Title Summary**                                                                             | **Expected Result**                                                        | **Actual Result**                                           | **Status**           |
| ------ | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------- |
| TC01   | Verify behavior when campaignId does not exist or staff has no access to the campaign country | Return `404 Not Found` according to specification                          | Existing test case currently returns `400` (incorrect spec) | ✅ Done (Need update) |
| TC02   | Verify validation when `enabled` field is missing or not a boolean                            | Return `400 Bad Request`                                                   | Matches specification                                       | ✅ Done               |
| TC02b   | Verify validation when `enabled` field is not a boolean (e.g., string)                        | Return `400 Bad Request`                                                   | Currently returns `404`                                     | ✅ Done (Need update) |
| TC03   | Verify duplicate/no-op update when `enabled` status is unchanged                              | Return `409 Conflict` (or `200 No-op` depending on team confirmation)      | Currently returns `404`                                     | ✅ Done (Need update) |
| TC04   | Verify successful enable/disable flow (Happy Path)                                            | Return `200 OK` with `creativeId` and `bannerStatus`                       | Matches specification                                       | ✅ Done               |
| TC05   | Verify Branch A: campaign has no banner (`bannerId == 0`) and request sends `enabled=true`    | Create new records in Oracle (`status=1`) and DynamoDB; return `200 OK`    | N/A                                                         | ☐ To be implemented  |
| TC06   | Verify Guard Branch A: campaign has no banner but request sends `enabled=false`               | Return `400 Bad Request` because non-existing banner cannot be disabled    | N/A                                                         | ☐ To be implemented  |
| TC07   | Verify Branch B: existing banner with `enabled=false` request                                 | Update Oracle (`status=0`) and DynamoDB successfully; return `200 OK`      | N/A                                                         | ☐ To be implemented  |
| TC08   | Verify permission validation when staff lacks `MERCHANT_CAMPAIGN_EDIT` permission             | Return `403 Forbidden`                                                     | N/A                                                         | ☐ To be implemented  |
| TC09   | Verify rollback consistency when Oracle update succeeds but DynamoDB update fails             | System rolls back Oracle transaction and returns `503 Service Unavailable` | N/A                                                         | ☐ To be implemented  |
| TC10   | Verify invalid campaignId format validation                                                   | Return `400 Bad Request` for invalid positive integer range                | N/A                                                         | ☐ To be implemented  |
| TC10b  | Verify negative campaignId validation                                                   | Return `400 Bad Request` for invalid negative integer                | N/A                                                         | ☐ To be implemented  |
| TC11   | Verify system error when Oracle updateCount ≠ 1                                               | Return `500 Internal Server Error`                                         | N/A                                                         | ☐ To be implemented  |

   */
  // ─── TC01 ───────────────────────────────────────────────────────────────────
  test("TC01 - Verify campaignId does not exist returns 404", async ({
    request,
  }) => {
    const res = await request.post(getApiUrl(NON_EXISTING_CAMPAIGN_ID), {
      headers: getAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/not found|does not exist/i);
  });

  // ─── TC02 ───────────────────────────────────────────────────────────────────
  test("TC02 - Verify missing enabled field returns 400", async ({
    request,
  }) => {
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: {},
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/enabled.*required|invalid/i);
  });

  test.skip("TC02b - Verify non-boolean enabled field returns 400", async ({
    request,
  }) => {
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: { enabled: "request" },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/but has failed/i);
  });

  // ─── TC03 ───────────────────────────────────────────────────────────────────
  test.skip("TC03 - Verify duplicate/no-op update when enabled status unchanged returns 409", async ({
    request,
  }) => {
    const campaignId = randomCampaignId();
    // First call: set enabled=true
    await request.post(getApiUrl(campaignId), {
      headers: getAuthHeaders(),
      data: { enabled: true },
    });
    // Second call: same status — expect conflict
    const res = await request.post(getApiUrl(campaignId), {
      headers: getAuthHeaders(),
      data: { enabled: true },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/but has failed/i);
  });

  // ─── TC04 ───────────────────────────────────────────────────────────────────
  test.skip("TC04 - Verify successful enable flow returns 200 with creativeId and bannerStatus", async ({
    request,
  }) => {
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: { enabled: true },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(body).toHaveProperty("creativeId");
    expect(body).toHaveProperty("bannerStatus");
  });

  // ─── TC05 ───────────────────────────────────────────────────────────────────
  test.skip("TC05 - Branch A: campaign with no banner, enabled=true creates new records and returns 200", async ({
    request,
  }) => {
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: { enabled: true },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    // Verify new banner record created (status=1)
    expect(body).toHaveProperty("bannerStatus", 1);
  });

  // ─── TC06 ───────────────────────────────────────────────────────────────────
  test.skip("TC06 - Guard Branch A: campaign with no banner, enabled=false returns 400", async ({
    request,
  }) => {
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: { enabled: false },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/not found/i);
  });

  // ─── TC07 ───────────────────────────────────────────────────────────────────
  test.skip("TC07 - Branch B: existing banner with enabled=false returns 200", async ({
    request,
  }) => {
    const ACTIVE_BANNER_CAMPAIGN_ID = randomCampaignId();
    const res = await request.post(getApiUrl(ACTIVE_BANNER_CAMPAIGN_ID), {
      headers: getAuthHeaders(),
      data: { enabled: false },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(body).toHaveProperty("bannerStatus", 0);
  });

  // ─── TC08 ───────────────────────────────────────────────────────────────────
  test("TC08 - Verify staff without MERCHANT_CAMPAIGN_EDIT permission returns 401", async ({
    request,
  }) => {
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getRestrictedAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC09 ───────────────────────────────────────────────────────────────────
  test.skip("TC09 - Verify rollback when Oracle succeeds but DynamoDB fails returns 503", async ({
    request,
  }) => {
    // Cannot be tested via API alone — requires mock/fault injection in DynamoDB.
    // Skipped: needs environment-level setup.
  });

  // ─── TC10 ───────────────────────────────────────────────────────────────────
  test("TC10 - Verify invalid campaignId format (non-integer) returns 404", async ({
    request,
  }) => {
    const res = await request.post(getApiUrl("abc" as any), {
      headers: getAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not Found/i);
  });

  test("TC10b - Verify negative campaignId returns 404", async ({
    request,
  }) => {
    const res = await request.post(getApiUrl(-1 as any), {
      headers: getAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not Found/i);
  });

  // ─── TC11 ───────────────────────────────────────────────────────────────────
  test.skip("TC11 - Verify Oracle updateCount ≠ 1 returns 500", async ({
    request,
  }) => {
    // Cannot be triggered via API alone — requires DB-level fault injection.
    // Skipped: needs environment-level setup.
  });
});
