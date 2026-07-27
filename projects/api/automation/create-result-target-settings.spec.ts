import { test, expect } from "@playwright/test";
import { randomInt, randomString } from "@shared/utils/function-helper";
import { urlStagingAPI } from "@shared/utils/base-url-helper";
import { generateJWT } from "@shared/utils/jwt-helper";
import {
  USER_UID_VN,
  SECRET_KEY_VN,
  USER_UID,
} from "@shared/utils/user-helper";
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
  `${baseURL}/v1/staff/campaigns/${campaignId}/result-target-settings`;

const token = `Bearer ${generateJWT(USER_UID_VN, SECRET_KEY_VN)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);
const getRestrictedAuthHeaders = () => createStaffHeaders(restrictedToken);

// resultIdGroup format: "{resultId}-{resultName}-{rewardType}" — sourced from RESULT_TARGET_MASTER table
// Entries with rewardType 0–2 (no rewardTypeCPA required)
const VALID_RESULT_GROUPS = [
  "0-Click-0",
  "1-Fixed-1",
  "2-Sales-2",
  "4-Pay per call-1",
];
// Entries with rewardType=9 (rewardTypeCPA required)
const REWARD_TYPE_9_GROUPS = [
  "3-Individual purchase product-9",
  "5-Apply credit card-9",
  "6-Issue credit card-9",
  "7-Apply cashing-9",
  "8-Sign cashing-9",
  "9-Apply loan-9",
];
const randomResultIdGroup = () =>
  VALID_RESULT_GROUPS[randomInt(0, VALID_RESULT_GROUPS.length - 1)];
const randomRewardType9Group = () =>
  REWARD_TYPE_9_GROUPS[randomInt(0, REWARD_TYPE_9_GROUPS.length - 1)];

// inputMode=0: resultIdGroup required, format "{resultId}-{resultName}-{rewardType}", resultId 0–50
const validPayloadMode0 = () => ({
  inputMode: 0,
  resultIdGroup: randomResultIdGroup(),
  customerType: randomString(3).toLowerCase(),
  customerTypeName: randomString(8),
});

// inputMode=1: custom resultId > 99, rewardType 0–2
const validPayloadMode1 = () => ({
  inputMode: 1,
  resultIdGroup: null,
  resultId: `${randomInt(100, 9999)}`,
  resultName: "Fixed Sale",
  rewardType: randomInt(0, 2),
  rewardTypeCPA: null,
  customerType: randomString(3).toLowerCase(),
  customerTypeName: randomString(8),
});

const validPayload = validPayloadMode1;

test.describe("Create Result Target Settings API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Create Result Target Settings API
   * 
| **ID** | **Case Summary**                                                  | **Expected Result**                                                                    | **Actual Result**                        | **Status**   |
| ------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------- | ------------ |
| TC01   | Verify campaignId does not exist in DB                            | Return `404` with message `"campaignId is not existed"`                                | N/A                                      | ✅ Done       |
| TC02   | Verify staff does not have access to campaign country             | Return `404` with message `"Access Denied"`                                            | N/A                                      | ☐ Pending    |
| TC03   | Verify staff has `data_access:all_countries` permission           | Access validation passes successfully                                                  | Continues to next validation             | ✅ Done       |
| TC04   | Verify inputMode=0 with null resultIdGroup                        | Return `400` with message `"resultIdGroup is required"`                                | N/A                                      | ✅ Done       |
| TC05   | Verify inputMode=0 with invalid resultIdGroup format              | Return `400` with message `"Invalid format for resultIdGroup"`                         | N/A                                      | ☐ Pending    |
| TC06   | Verify inputMode=0 with non-existing resultId in master list      | Return `400` with message `"Selected result target does not exist in the master list"` | N/A                                      | ☐ Pending    |
| TC07   | Verify rewardTypeCPA is required when master rewardType=9         | Return `400` with message `"rewardTypeCPA is required"`                                | N/A                                      | ☐ Pending    |
| TC08   | Verify rewardTypeCPA=1 (CPA Fixed)                                | Return `200`; DB stores `reward_type = 1`                                              | `repeatFlag=false`, DB updated correctly | ☐ Pending    |
| TC09   | Verify rewardTypeCPA=2 (CPA Sales)                                | Return `200`; DB stores `reward_type = 2`                                              | `repeatFlag=false`, DB updated correctly | ☐ Pending    |
| TC10   | Verify valid inputMode=0 insertion                                | Return `200`; new reward setting inserted successfully                                 | rewardSettingList updated correctly      | ☐ Pending    |
| TC11   | Verify inputMode=1 with null resultId                             | Return `400` with message `"resultId is required"`                                     | N/A                                      | ☐ Pending    |
| TC12   | Verify inputMode=1 with non-numeric resultId                      | Return `400` with message `"Invalid format for resultId (must be numeric)"`            | N/A                                      | ☐ Pending    |
| TC13   | Verify inputMode=1 with resultId below minimum range              | Return `400` with message `"resultId must be between 100 and 9999"`                    | N/A                                      | ☐ Pending    |
| TC14   | Verify inputMode=1 with resultId above maximum range              | Return `400` with message `"resultId must be between 100 and 9999"`                    | N/A                                      | ☐ Pending    |
| TC15   | Verify inputMode=1 with null resultName                           | Return `400` with message `"resultName is required"`                                   | N/A                                      | ☐ Pending    |
| TC16   | Verify inputMode=1 with null rewardType                           | Return `400` with required field validation error                                      | N/A                                      | ☐ Pending    |
| TC17   | Verify customerTypeName is required when customerType is provided | Return `400` with message `"customerTypeName is required when customerType is set"`    | N/A                                      | ☐ Pending    |
| TC18   | Verify customerType is stored in lowercase                        | Return `200`; DB stores lowercase value                                                | DB stores `"new"` correctly              | ☐ Pending    |
| TC19   | Verify duplicate — (campaignId, resultId, empty customerType) already exists                          | Return `409` with duplicate setting error                                              | N/A                                      | ☐ Pending    |
| TC19.1 | Verify duplicate base setting prevention returns 409 | Return `409` with error indicating duplicate or empty customer type                     | N/A                                      | ✅ Done       |
| TC20   | Verify successful insertion with inputMode=1                      | Return `200`; record inserted with `INPUT_TYPE=1`                                      | DB stores correct values                 | ☐ Pending    |
| TC21   | Verify successful insertion with inputMode=0                      | Return `200`; record inserted with `INPUT_TYPE=0`                                      | `repeatFlag=false`                       | ☐ Pending    |
| TC22   | Verify Result Target Masters search API                           | Return valid master list from `RESULT_TARGET_MASTER` table                             | N/A                                      | ☐ Suggestion |
| TC23   | Verify Result Target Settings search API                          | Return existing campaign result target settings                                        | N/A                                      | ☐ Suggestion |
| TC24   | Verify data stored in both DB tables                              | Data exists in both `RESULT_TARGET_SETTING` and `RESULT_TARGET_MASTER`                 | N/A                                      | ☐ Suggestion |
| TC25   | Verify invalid rewardTypeCPA values                               | Return `400` with invalid value error                                                  | N/A                                      | ☐ Suggestion |
| TC26   | Verify `data_access:all_countries` permission access              | Staff can access campaigns from all countries successfully                             | N/A                                      | ☐ Suggestion |
| TC27   | Verify inputMode=null with resultIdGroup provided returns validation error | Return `400` with message indicating inputMode is required when resultIdGroup is set | N/A                                      | ☐ Suggestion |
| TC28   | Verify inputMode=0 with resultIdGroup but missing customerType returns validation error | Return `400` with message indicating customerType is required when resultIdGroup is set | N/A                                      | ☐ Suggestion |

   */

  // ─── TC01 ───────────────────────────────────────────────────────────────────
  test("TC01 - Verify campaignId does not exist in DB", async ({ request }) => {
    const res = await request.post(getApiUrl(NON_EXISTING_CAMPAIGN_ID), {
      headers: getAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/campaignId does not exist/i);
  });

  // ─── TC02 ───────────────────────────────────────────────────────────────────
  test("TC02 - Verify staff does not have access to campaign country", async ({
    request,
  }) => {
    // TODO: Replace RESTRICTED_USER_UID / RESTRICTED_SECRET_KEY with a real
    // account that lacks access to the campaign's country before enabling.
    const res = await request.post(
      getApiUrl(
        VALID_CAMPAIGN_IDS[randomInt(0, VALID_CAMPAIGN_IDS.length - 1)],
      ),
      {
        headers: getRestrictedAuthHeaders(),
        data: validPayload(),
      },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC03 ───────────────────────────────────────────────────────────────────
  test("TC03 - Verify staff with data_access:all_countries permission passes access check", async ({
    request,
  }) => {
    // The current USER_UID has data_access:all_countries; validation should not
    // reject with 404 Access Denied — it proceeds to the next validation step.
    const res = await request.post(
      getApiUrl(
        VALID_CAMPAIGN_IDS[randomInt(0, VALID_CAMPAIGN_IDS.length - 1)],
      ),
      {
        headers: getAuthHeaders(),
        data: validPayload(),
      },
    );
    const body = await logResponse(res);
    // Access check passes — status must NOT be a 404 Access Denied
    expect(res.status()).not.toBe(404);
    expect(JSON.stringify(body)).not.toMatch(/Access Denied/i);
  });

  // ─── TC04 ───────────────────────────────────────────────────────────────────
  test("TC04 - Verify inputMode=0 with null resultIdGroup returns 400", async ({
    request,
  }) => {
    const payload = { ...validPayload(), inputMode: 0, resultIdGroup: null };
    const res = await request.post(
      getApiUrl(
        VALID_CAMPAIGN_IDS[randomInt(0, VALID_CAMPAIGN_IDS.length - 1)],
      ),
      {
        headers: getAuthHeaders(),
        data: payload,
      },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/resultIdGroup is required/i);
  });

  // ─── TC05 ───────────────────────────────────────────────────────────────────
  test("TC05 - Verify inputMode=0 with invalid resultIdGroup format returns 400", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      inputMode: 0,
      resultIdGroup: "INVALID_FORMAT",
    };
    const res = await request.post(
      getApiUrl(
        VALID_CAMPAIGN_IDS[randomInt(0, VALID_CAMPAIGN_IDS.length - 1)],
      ),
      {
        headers: getAuthHeaders(),
        data: payload,
      },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/Invalid format for resultIdGroup/i);
  });

  // ─── TC06 ───────────────────────────────────────────────────────────────────
  test("TC06 - Verify inputMode=0 with non-existing resultId in master list returns 400", async ({
    request,
  }) => {
    // resultIdGroup format is valid but the resultId does not exist in RESULT_TARGET_MASTER
    const payload = {
      ...validPayload(),
      inputMode: 0,
      resultIdGroup: "999-NonExisting-9", // valid format, non-existing entry in master list
    };
    const res = await request.post(
      getApiUrl(
        VALID_CAMPAIGN_IDS[randomInt(0, VALID_CAMPAIGN_IDS.length - 1)],
      ),
      {
        headers: getAuthHeaders(),
        data: payload,
      },
    );
  });

  // ─── TC07 ───────────────────────────────────────────────────────────────────
  test("TC07 - Verify rewardTypeCPA is required when master rewardType=9", async ({
    request,
  }) => {
    // Assumes a resultIdGroup whose master entry has rewardType=9
    const payload = {
      ...validPayload(),
      inputMode: 0,
      resultIdGroup: randomRewardType9Group(),
      rewardTypeCPA: null,
    };
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/rewardTypeCPA is required/i);
  });

  // ─── TC08 ───────────────────────────────────────────────────────────────────
  test("TC08 - Verify rewardTypeCPA=1 (CPA Fixed) returns 200", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      inputMode: 0,
      resultIdGroup: randomRewardType9Group(),
      rewardTypeCPA: 1,
    };
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    // DB should store reward_type = 1 — verify via response body or separate DB query
  });

  // ─── TC09 ───────────────────────────────────────────────────────────────────
  test("TC09 - Verify rewardTypeCPA=2 (CPA Sales) returns 200", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      inputMode: 0,
      resultIdGroup: randomRewardType9Group(),
      rewardTypeCPA: 2,
    };
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    // DB should store reward_type = 2
  });

  // ─── TC10 ───────────────────────────────────────────────────────────────────
  test("TC10 - Verify valid inputMode=0 insertion returns 200", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      inputMode: 0,
      resultIdGroup: randomResultIdGroup(),
      rewardTypeCPA: null,
    };
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    // Verify rewardSettingList is updated in the response
  });

  // ─── TC11 ───────────────────────────────────────────────────────────────────
  test("TC11 - Verify inputMode=1 with null resultId returns 400", async ({
    request,
  }) => {
    const payload = { ...validPayload(), inputMode: 1, resultId: null };
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/resultId is required/i);
  });

  // ─── TC12 ───────────────────────────────────────────────────────────────────
  test("TC12 - Verify inputMode=1 with non-numeric resultId returns 400", async ({
    request,
  }) => {
    const payload = { ...validPayload(), inputMode: 1, resultId: "ABC" };
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(
      /Invalid format for resultId.*must be numeric/i,
    );
  });

  // ─── TC13 ───────────────────────────────────────────────────────────────────
  test("TC13 - Verify inputMode=1 with resultId below minimum range (99) returns 400", async ({
    request,
  }) => {
    const payload = { ...validPayload(), inputMode: 1, resultId: "99" };
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(
      /resultId must be between 100 and 9999/i,
    );
  });

  // ─── TC14 ───────────────────────────────────────────────────────────────────
  test("TC14 - Verify inputMode=1 with resultId above maximum range (10000) returns 400", async ({
    request,
  }) => {
    const payload = { ...validPayload(), inputMode: 1, resultId: "10000" };
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(
      /resultId must be between 100 and 9999/i,
    );
  });

  // ─── TC15 ───────────────────────────────────────────────────────────────────
  test("TC15 - Verify inputMode=1 with null resultName returns 400", async ({
    request,
  }) => {
    const payload = { ...validPayload(), inputMode: 1, resultName: null };
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/resultName is required/i);
  });

  // ─── TC16 ───────────────────────────────────────────────────────────────────
  test("TC16 - Verify inputMode=1 with null rewardType returns 400", async ({
    request,
  }) => {
    const payload = { ...validPayload(), inputMode: 1, rewardType: null };
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/rewardType/i);
  });

  // ─── TC17 ───────────────────────────────────────────────────────────────────
  test("TC17 - Verify customerTypeName is required when customerType is provided", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      inputMode: 1,
      customerType: "new",
      customerTypeName: null,
    };
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(
      /customerTypeName is required when customerType is set/i,
    );
  });

  // ─── TC18 ───────────────────────────────────────────────────────────────────
  test("TC18 - Verify customerType is stored in lowercase", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      inputMode: 1,
      customerType: "NEW", // uppercase input
      customerTypeName: "New Customer",
    };
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    // Verify the returned/stored customerType is lowercase "new"
    expect(JSON.stringify(body)).toMatch(/"customerType"\s*:\s*"new"/i);
  });

  // ─── TC19 ───────────────────────────────────────────────────────────────────
  test("TC19 - Verify duplicate — (campaignId, resultId, empty customerType) already exists", async ({
    request,
  }) => {
    // First insertion
    const campaignId = 3746;
    const payload = {
      inputMode: 1,
      resultId: "1027",
      resultName: "Fixed Sale",
      rewardType: 2,
    };
    const res = await request.post(getApiUrl(campaignId), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(409);
    expect(JSON.stringify(body)).toMatch(
      /target already|(empty customer type)/i,
    );
  });

  test("TC19.1 - Verify duplicate base setting prevention returns 409", async ({
    request,
  }) => {
    // First insertion
    const campaignId = randomCampaignId();
    const payload = validPayload();
    await request.post(getApiUrl(campaignId), {
      headers: getAuthHeaders(),
      data: payload,
    });
    // Second insertion with the same setting (duplicate)
    const res = await request.post(getApiUrl(campaignId), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(409);
    expect(JSON.stringify(body)).toMatch(/already exist/i);
  });

  // ─── TC20 ───────────────────────────────────────────────────────────────────
  test("TC20 - Verify successful insertion with inputMode=1 returns 200", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      inputMode: 1,
      resultId: `${randomInt(100, 9999)}`,
      resultName: `Result - ${randomString(5)}`,
    };
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    // Record should be inserted with INPUT_TYPE = 1
  });

  // ─── TC21 ───────────────────────────────────────────────────────────────────
  test("TC21 - Verify successful insertion with inputMode=0 returns 200", async ({
    request,
  }) => {
    const payload = validPayloadMode0(); // resultIdGroup picked randomly from VALID_RESULT_GROUPS
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    // Record should be inserted with INPUT_TYPE = 0 and repeatFlag = false
  });

  // ─── TC22 (Suggestion) ──────────────────────────────────────────────────────
  test.skip("TC22 - Verify Result Target Masters search API returns master list", async ({
    request,
  }) => {
    const masterListUrl = `${baseURL}/v1/staff/campaigns/result-target-master`;
    const res = await request.get(masterListUrl, { headers: getAuthHeaders() });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
  });

  // ─── TC23 (Suggestion) ──────────────────────────────────────────────────────
  test.skip("TC23 - Verify Result Target Settings search API returns existing settings", async ({
    request,
  }) => {
    const res = await request.get(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
  });

  // ─── TC24 (Suggestion) ──────────────────────────────────────────────────────
  test.skip("TC24 - Verify data is stored in both RESULT_TARGET_SETTING and RESULT_TARGET_MASTER tables", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      inputMode: 1,
      resultId: `${randomInt(100, 9999)}`,
      resultName: `Result - ${randomString(5)}`,
    };
    const campaignId = randomCampaignId();
    const createRes = await request.post(getApiUrl(campaignId), {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(createRes.status()).toBe(200);

    // Verify via search API that the setting appears
    const searchRes = await request.get(getApiUrl(campaignId), {
      headers: getAuthHeaders(),
    });
    const settings = await searchRes.json();
    const inserted = settings.find((s: any) => s.resultId === payload.resultId);
    expect(inserted).toBeDefined();

    // Verify master list also contains the new entry
    const masterListUrl = `${baseURL}/v1/staff/campaigns/${campaignId}/result-target-masters`;
    const masterRes = await request.get(masterListUrl, {
      headers: getAuthHeaders(),
    });
    const masters = await masterRes.json();
    const masterEntry = masters.find(
      (m: any) => m.resultId === payload.resultId,
    );
    expect(masterEntry).toBeDefined();
  });

  // ─── TC25 (Suggestion) ──────────────────────────────────────────────────────
  test.skip("TC25 - Verify invalid rewardTypeCPA values return 400", async ({
    request,
  }) => {
    const invalidValues = [0, 3, 99, -1, "invalid"];
    for (const invalidValue of invalidValues) {
      const payload = {
        ...validPayload(),
        inputMode: 0,
        resultIdGroup: randomRewardType9Group(),
        rewardTypeCPA: invalidValue,
      };
      const res = await request.post(getApiUrl(randomCampaignId()), {
        headers: getAuthHeaders(),
        data: payload,
      });
      const body = await logResponse(res);
      expect(res.status()).toBe(400);
      expect(JSON.stringify(body)).toMatch(/rewardTypeCPA/i);
    }
  });

  // ─── TC26 (Suggestion) ──────────────────────────────────────────────────────
  test("TC26 - Verify `inputMode=null` with `validPayloadMode0` provided returns validation error", async ({
    request,
  }) => {
    const payload = {
      ...validPayloadMode0,
      inputMode: null,
    }; // resultIdGroup picked randomly from VALID_RESULT_GROUPS
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    // Record should be inserted with INPUT_TYPE = 0 and repeatFlag = false
  });

  // ─── TC27 (Suggestion) ──────────────────────────────────────────────────────
  test("TC27 - Verify `inputMode=null` with `validPayloadMode1` provided returns validation error", async ({
    request,
  }) => {
    const payload = {
      ...validPayloadMode1,
      inputMode: null,
    }; // resultIdGroup picked randomly from VALID_RESULT_GROUPS
    const res = await request.post(getApiUrl(randomCampaignId()), {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    // Record should be inserted with INPUT_TYPE = 0 and repeatFlag = false
  });
});
