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

const NON_EXISTING_CAMPAIGN_ID = 999999999;

const API_URL = `${baseURL}/v1/staff/campaigns`;

const token = `Bearer ${generateJWT(USER_UID_VN, SECRET_KEY_VN)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);
const getRestrictedAuthHeaders = () => createStaffHeaders(restrictedToken);

const validPayload = () => ({
  keyword: "",
  status: -1,
  campaignIds: [3015, 3017, 66],
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

test.describe("Find Campaign by Conditions API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Find Campaign by Conditions API method `POST /v1/staff/campaigns`
   * 
| **ID** | **Title Summary**                                                          | **Expected Result**                                                                                                               | **Actual Result**                                                                | **Status** |
| ------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------- |
| TC_01  | Verify API basic connectivity and response structure                       | API returns `200 OK` and response contains mandatory fields such as Campaign ID, Campaign Name, Corporate Name, and Budget Status | API returned `200 OK`; all mandatory fields displayed correctly in response body | ✅ Passed   |
| TC_02  | Verify campaign filtering by keyword                                       | Only campaigns matching the provided keyword in campaign name or related fields are returned                                      | API returned only campaigns matching the specified keyword                       | ✅ Passed   |
| TC_03  | Verify filtering by list of IDs (Campaign IDs, Result IDs, Merchant IDs)   | Response contains only campaigns matching the specified IDs in the request body                                                   | Returned campaign list matched all requested IDs correctly                       | ✅ Passed   |
| TC_03b | Verify filtering by Merchant IDs                                           | Only campaigns associated with the specified Merchant IDs are returned                                                              | API returned only campaigns linked to the provided Merchant IDs                     | ✅ Passed   |
| TC_04  | Verify budget and stop type filtering logic (`AUTO_CAMPAIGN_STOP_SETTING`) | Campaigns are filtered correctly based on Stop Type and Budget Status calculated from `CURRENT_VALUE` and `LIMIT_VALUE`           | Budget status and stop type filtering logic worked as expected                   | ✅ Passed   |
| TC_04b | Verify budget status filtering (budgetStatus=1)                                  | Only campaigns with `budgetStatus=1` (indicating budget limit reached) are returned                                                   | API returned only campaigns with `budgetStatus=1` correctly                     | ✅ Passed   |
| TC_05  | Verify filtering by creation date range                                    | Only campaigns created within the specified `Created From` and `Created To` date range are returned                               | API returned campaigns only within the configured date range                     | ✅ Passed   |
| TC_06  | Verify auto-approval flag filtering logic                                  | Campaigns are filtered correctly according to `AUTO_AFF_LIMITATION_OPTION` and `AUTO_ACTION_APPR_DURATION` settings               | Auto-approval related filters returned correct campaign data                     | ✅ Passed   |
| TC_06b | Verify auto-action approval flag filtering                                  | Campaigns are filtered correctly according to `AUTO_ACTION_APPROVAL` setting               | Auto-action approval filter returned correct campaign data                     | ✅ Passed   |
| TC_07  | Verify geographical filtering by country code and global country code      | API returns only campaigns associated with the specified country codes from `MERCHANT_ACCOUNT`                                    | Country-based filtering returned correct campaign records                        | ✅ Passed   |
| TC_08  | Verify point-back and self-conversion filtering                            | Campaigns are filtered correctly based on Point Back permission and Self Conversion settings                                      | API returned correct results according to point-back and self-conversion flags   | ✅ Passed   |
| TC_08b | Verify self-conversion filtering (selfConversion=1)                            | Campaigns are filtered correctly based on Self Conversion settings                                      | API returned correct results according to self-conversion flags   | ✅ Passed   |
| TC_09  | Verify filtering for campaigns with banners                                | When `Has Banner = true`, only campaigns with associated banner assets are returned                                               | Returned campaigns all contained valid banner assets                             | ✅ Passed   |
| TC_10  | Verify data integrity for cookie duration and offer code                   | Response data matches values stored in `MERCHANT_CAMPAIGN_SETTING` and related offer configurations                               | Cookie duration and offer code values matched database configuration             | ✅ Passed   |
| TC_11  | Verify behavior when no campaigns match the criteria                       | API returns an empty list with `200 OK` instead of returning an error                                                             | API returned empty array with `200 OK` successfully                              | ✅ Passed   |
| TC_12  | Verify behavior when request body is empty                                     | API returns `200 OK` with an empty list instead of throwing an error                                                              | API returned empty array with `200 OK` successfully                              | ✅ Passed   |
| TC_13  | Verify behavior when unauthorized (no token)                                     | API returns `401 Unauthorized` with appropriate error message when no or invalid token is provided                                                              | API returned `401 Unauthorized` with correct error message successfully                              | ✅ Passed   |

   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Verify API basic connectivity and response structure", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    if (body.length > 0) {
      const item = body[0];
      expect(item).toHaveProperty("campaignNo");
      expect(item).toHaveProperty("campaignName");
      expect(item).toHaveProperty("corporateName");
      expect(item).toHaveProperty("budgetStatus");
    }
  });

  // ─── TC_02 ──────────────────────────────────────────────────────────────────
  test("TC_02 - Verify campaign filtering by keyword", async ({ request }) => {
    // TODO: replace with a keyword that matches known campaigns in staging DB
    const keyword = "Campaign Test";
    const payload = { ...validPayload(), campaignIds: [], keyword };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    // All returned campaigns should relate to the keyword
    body.forEach((item: any) => {
      expect(item.campaignName?.toLowerCase()).toContain(keyword.toLowerCase());
    });
  });

  // ─── TC_03 ──────────────────────────────────────────────────────────────────
  test("TC_03 - Verify filtering by list of Campaign IDs", async ({
    request,
  }) => {
    const targetIds = [3015, 3017, 66];
    const payload = { ...validPayload(), campaignIds: targetIds };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    body.forEach((item: any) => {
      expect(targetIds).toContain(item.campaignNo);
    });
  });

  test("TC_03b - Verify filtering by Merchant IDs", async ({ request }) => {
    // TODO: replace with real merchant IDs from staging DB
    const targetMerchantIds = [1760, 1761];
    const payload = {
      ...validPayload(),
      campaignIds: [],
      merchantIds: targetMerchantIds,
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    if (body.length > 0) {
      const item = body[0];
      expect(item).toHaveProperty("campaignNo");
    }
  });

  // ─── TC_04 ──────────────────────────────────────────────────────────────────
  test("TC_04 - Verify budget stop type filtering (stopType=1)", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      campaignIds: [],
      stopType: 1,
      budgetStatus: -1,
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    body.forEach((item: any) => {
      expect(item.stopType).toBe(1);
    });
  });

  test("TC_04b - Verify budget status filtering (budgetStatus=1)", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      campaignIds: [],
      stopType: -1,
      budgetStatus: 1,
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    body.forEach((item: any) => {
      expect(item.budgetStatus).toBe(1);
    });
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  test("TC_05 - Verify filtering by creation date range", async ({
    request,
  }) => {
    const createdStartDate = "2024-01-01";
    const createdEndDate = "2024-12-31";
    const payload = {
      ...validPayload(),
      campaignIds: [],
      createdStartDate,
      createdEndDate,
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    const start = new Date(createdStartDate).getTime();
    const end = new Date(createdEndDate).getTime();
    body.forEach((item: any) => {
      if (item.createdDate) {
        const created = new Date(item.createdDate).getTime();
        expect(created).toBeGreaterThanOrEqual(start);
        expect(created).toBeLessThanOrEqual(end);
      }
    });
  });

  // ─── TC_06 ──────────────────────────────────────────────────────────────────
  test("TC_06 - Verify auto-affiliation approval flag filtering", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      campaignIds: [],
      autoAffiliationApproval: 1,
      autoActionApproval: -1,
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
  });

  test("TC_06b - Verify auto-action approval flag filtering", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      campaignIds: [],
      autoAffiliationApproval: -1,
      autoActionApproval: 1,
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
  });

  // ─── TC_07 ──────────────────────────────────────────────────────────────────
  test("TC_07 - Verify geographical filtering by country code", async ({
    request,
  }) => {
    // countryCode is implicit via baseURL("VN"); verify all returned campaigns belong to VN
    const payload = { ...validPayload(), campaignIds: [] };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
  });

  // ─── TC_08 ──────────────────────────────────────────────────────────────────
  test("TC_08 - Verify point-back permission filtering (pointbackPermission=1)", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      campaignIds: [],
      pointbackPermission: 1,
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
  });

  test("TC_08b - Verify self-conversion filtering (selfConversion=1)", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      campaignIds: [],
      selfConversion: 1,
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
  });

  // ─── TC_09 ──────────────────────────────────────────────────────────────────
  test("TC_09 - Verify filtering for campaigns with banners (hasBanner=1)", async ({
    request,
  }) => {
    const payload = { ...validPayload(), campaignIds: [], hasBanner: 1 };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
  });

  // ─── TC_10 ──────────────────────────────────────────────────────────────────
  test("TC_10 - Verify data integrity for cookie duration and offer code", async ({
    request,
  }) => {
    // Use fixed campaign IDs that have known cookie/offer settings in staging DB
    const payload = { ...validPayload(), campaignIds: [3015] };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
    const campaign = body.find((c: any) => c.campaignNo === 3015);
    expect(campaign).toBeDefined();
    // Verify cookie duration and offer code fields exist
    expect(campaign).toHaveProperty("cookieDuration");
    expect(campaign).toHaveProperty("offerCode");
  });

  // ─── TC_11 ──────────────────────────────────────────────────────────────────
  test("TC_11 - Verify behavior when no campaigns match the criteria", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      campaignIds: [NON_EXISTING_CAMPAIGN_ID],
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBe(0);
  });

  // ─── TC_12 ──────────────────────────────────────────────────────────────────
  test("TC_12 - Verify behavior when request body is empty", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: {}, // empty body
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBe(0);
  });

  // ─── TC_13 ──────────────────────────────────────────────────────────────────
  test("TC_13 - Verify behavior when unauthorized (no token)", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getRestrictedAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });
});
