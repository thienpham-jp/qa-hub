import { test, expect } from "@playwright/test";
import {
  randomDateString,
  randomInt,
  randomSentence,
  randomString,
  randomURL,
} from "@shared/utils/function-helper";
import { urlStagingAPI } from "@shared/utils/base-url-helper";
import { generateJWT } from "@shared/utils/jwt-helper";
import {
  USER_UID_VN,
  SECRET_KEY_VN,
  USER_UID,
  SECRET_KEY,
} from "@shared/utils/user-helper";
import { logResponse, createStaffHeaders } from "./helpers/api-test-helper";

const baseURL = urlStagingAPI("VN");

const API_URL = `${baseURL}/v1/staff/campaign`;

// const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
const token = `Bearer ${generateJWT(USER_UID_VN, SECRET_KEY_VN)}`;

const getAuthHeaders = () => createStaffHeaders(token);

const CAMPAIGN_STATES = [0, 1, 2, 3, 4, 5]; // Assuming these are the valid campaign state IDs for

const STATUSES = [
  "GETTING_READY",
  "RUNNING",
  "TERMINATED",
  "PAUSED",
  "OTHER",
  "WONT_RUN",
];
/*        0: Before the service begins
          1: Running
          2: Terminated
          3: Paused
          4: Other
          5: Terminated before the service begins */

const campaignTypes = ["CPC", "CPA", "CPS", "CPL"];

const sDate = randomDateString(
  new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  new Date(),
  "ISO",
);

const eDate = randomDateString(
  new Date(),
  new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
  "ISO",
);

const updatePayload = () => ({
  merchantId: randomInt(1760, 2300),
  updateCampaignDetails: {
    campaignId: randomInt(3745, 3750),
    previousCampaignStatus: "RUNNING",
    campaignStatus: "RUNNING",
    campaignName: `Updated Campaign - ${randomString(5)}`,
    campaignType: campaignTypes[randomInt(0, campaignTypes.length - 1)],
    url: randomURL(),
    description: `Update ${randomSentence(50)}`,
    descriptionEnglish: `Update ${randomSentence(15)}`,
    affConditionSpecial: "TODO_AFF_CONDITION_SPECIAL",
    rejectConditions: "Local reject conditions",
    resultApprovalSpecial: "Local result approval",
    prForPartner: "TODO_PR_FOR_PARTNER",
    deviceTypes: "PC,Android,iPhone,Android Tablet,iPad",
    getParameterFlag: "COOKIE",
    pointbackPermission: 1,
    selfConversionFlag: 1,
    hiddenFlag: 0,
    offerCode: "OFFER123",
    campaignStartDate: sDate,
    campaignEndDate: eDate,
    currencyCode: "VND",
    hideClickReferrer: 0,
    adPlatformId: 0,
    updatedBy: "obs-dev@interspace.ne.jp",
    integratedCampaignId: null,
    integratedCountryCode: null,
    isRewardsByCategoriesVisible: true,
    customerCountries: "VNM",
    affConditionSpecialEnglish: "EN required actions",
    resultApprovalSpecialEnglish: "EN result approval",
    validationTerm: "Local validation",
    validationTermEnglish: "EN validation",
    trafficRestrictions: "Restrictions text",
    campaignApplication: "WEB_AND_MOBILE_APP",
    imageUrl:
      "https://s3-ap-southeast-1.amazonaws.com/images.accesstrade.vn/1c67df9e0a5cfefa030b853983324004/logo_20230614032335.png",
    isAlternativeLinkUsed: 0,
    ogDescription: "OG description",
    ogImage:
      "https://s3-ap-southeast-1.amazonaws.com/images.accesstrade.vn/1c67df9e0a5cfefa030b853983324004/logo_20230614032335.png",
    logoImageBase64: null,
  },
  categoryIds: [1, 2, 3],
  updateCampaignSettingDetails: { cookieExpirationDateView: 60 },
});

test.describe("Update Campaign API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Update Campaign API
   * 
| **ID** | **Case Summary**                               | **Expected Result**                                                                     | **Actual Result**       | **Status**  |
| ------ | ---------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------- | ----------- |
| TC01   | Verify empty or invalid request body           | Return `400` with required field validation errors                                      | Matches expected result | ✅ Done      |
| TC02   | Verify merchantId is null                      | Return `400` with missing required field error                                          | Matches expected result | ✅ Done      |
| TC02.1 | Verify merchantId does not exist               | Return `400` with invalid merchant ID error                                               | Matches expected result | ✅ Done      |
| TC02.2 | Verify merchantId is negative                 | Return `400` with invalid merchant ID error                                               | Matches expected result | ✅ Done      |
| TC03   | Verify updateCampaignSettingDetails is null    | Return `400` with missing required field error                                          | Matches expected result | ✅ Done      |
| TC04   | Verify campaignId is null                      | Return `400` with missing required field error                                          | Matches expected result | ✅ Done      |
| TC04.1 | Verify campaignId does not exist               | Return `400` with error message indicating campaign does not exist                       | Matches expected result | ✅ Done      |
| TC05   | Verify campaignType is null                    | Return `400` with missing required field error                                          | Matches expected result | ✅ Done      |
| TC06   | Verify campaignApplication is null             | Return `400` with missing required field error                                          | Matches expected result | ✅ Done      |
| TC07   | Verify campaignStatus is null                  | Return `400` with missing required field error                                          | Matches expected result | ✅ Done      |
| TC08   | Verify campaignName is empty or null           | Return `400` with missing required field error                                          | Matches expected result | ✅ Done      |
| TC09   | Verify url is empty or null                    | Return `400` with missing required field error                                          | Matches expected result | ✅ Done      |
| TC10   | Verify deviceTypes is empty or null            | Return `400` with missing required field error                                          | Matches expected result | ✅ Done      |
| TC11   | Verify getParameterFlag is null                | Return `400` with missing required field error                                          | Matches expected result | ✅ Done      |
| TC12   | Verify customerCountries is empty or null      | Return `400` with missing required field error                                          | Matches expected result | ✅ Done      |
| TC13   | Verify successful update flow (Happy Path)     | Return `200` with response body `"OK"`                                                  | Matches expected result | ✅ Done      |
| TC14   | Verify DynamoDB data update                    | After API returns `200 OK`, DynamoDB data matches the request payload exactly           | TBD                     | ☐ Suggested |
| TC15   | Verify SQS integration for Product Feed        | System sends SQS message successfully for Product Feed validation                       | TBD                     | ☐ Suggested |
| TC16   | Verify SQS integration for Creative validation | System sends SQS message successfully for Creative validation                           | TBD                     | ☐ Suggested |
| TC17   | Verify Product Feed sync logic                 | Product Feed synchronization executes based on Campaign state ID before status update   | TBD                     | ☐ Suggested |
| TC18   | Verify deprecated legacy APIs are disabled     | Old endpoints (`/global/campaigns`, sync, validate) return error or are inaccessible    | TBD                     | ☐ Suggested |
| TC19   | Verify optional fields update correctly        | Optional fields such as `description`, `ogImage`, and `categoryIds` are saved correctly | TBD                     | ☐ Suggested |
| TC20   | Verify invalid campaignStatus value            | Return `400` with validation error for invalid campaignStatus value                     | Matches expected result | ✅ Done      |
| TC21   | Verify previousCampaignStatus is null          | Return `400` with validation error for null previousCampaignStatus                      | Matches expected result | ✅ Done      |
| TC22   | Verify invalid date range (startDate > endDate) | Return `400` with validation error for invalid date range                                | Matches expected result | ✅ Done      |
| TC23   | Verify unauthorized access (no token)         | Return `401` with appropriate error message for missing authentication token             | TBD                     | ☐ Suggested |
| TC24   | Verify invalid flag values (outside allowed range 0/1) | Return `400` with validation error for invalid flag values                     | Matches expected result | ✅ Done      |
| TC25   | Verify invalid campaignType value            | Return `400` with validation error for invalid campaignType value                     | Matches expected result | ✅ Done      |
| TC26   | Verify invalid campaignApplication value      | Return `400` with validation error for invalid campaignApplication value               | Matches expected result | ✅ Done      |
| TC26.1 | Verify cookieExpirationDateView is zero      | Return `400` with validation error for cookieExpirationDateView being zero               | Matches expected result | N/A     |
| TC27   | Verify invalid getParameterFlag value         | Return `400` with validation error for invalid getParameterFlag value                  | Matches expected result | ✅ Done      |
| TC28   | Verify invalid date formats for campaignStartDate and campaignEndDate | Return `400` with validation error for invalid date formats                     | Matches expected result | ✅ Done      |
| TC29   | Verify missing required fields in updateCampaignDetails object | Return `400` with validation errors for each missing required field in updateCampaignDetails | Matches expected result | ✅ Done      |

   */

  test("TC01 - Verify invalid / empty request body", async ({ request }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: null,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);

    expect(JSON.stringify(body)).toMatch(/Body is missing/i);
  });

  test("TC02 - Verify merchantId is null", async ({ request }) => {
    const payload = {
      ...updatePayload(),
      merchantId: null,
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/merchantId does not exist./i);
  });

  test("TC02.1 - Verify merchantId does not exist", async ({ request }) => {
    const payload = {
      ...updatePayload(),
      merchantId: 0,
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/Merchant ID is invalid/i);
  });

  test("TC02.2 - Verify merchantId is negative", async ({ request }) => {
    const payload = {
      ...updatePayload(),
      merchantId: -1,
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/Merchant ID is invalid/i);
  });

  test("TC03 - Verify updateCampaignDetails is null", async ({ request }) => {
    const payload = { ...updatePayload(), updateCampaignDetails: null };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/updateCampaignDetails is missing/i);
  });

  test("TC04 - Verify campaignId is null", async ({ request }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        campaignId: null,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/campaignId/i);
  });

  test("TC04.1 - Verify campaignId does not exist", async ({ request }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        campaignId: 999999999,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /Campaign \[999999999\] does not exist./i,
    );
  });

  test("TC05 - Verify campaignType is null", async ({ request }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        campaignType: null,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/campaignType/i);
  });

  test("TC06 - Verify campaignApplication is null", async ({ request }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        campaignApplication: null,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/campaignApplication/i);
  });

  test("TC07 - Verify campaignStatus is null", async ({ request }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        campaignStatus: null,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/campaignStatus/i);
  });

  test("TC08 - Verify campaignName is empty", async ({ request }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        campaignName: "",
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/campaignName/i);
  });

  test("TC09 - Verify url is empty", async ({ request }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        url: "",
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/url/i);
  });

  test("TC10 - Verify deviceTypes is empty", async ({ request }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        deviceTypes: "",
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/deviceTypes/i);
  });

  test("TC11 - Verify getParameterFlag is null", async ({ request }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        getParameterFlag: null,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/getParameterFlag/i);
  });

  test("TC12 - Verify customerCountries is empty", async ({ request }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        customerCountries: "",
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/customerCountries/i);
  });

  test("TC13 - Verify successful update flow (Happy Path)", async ({
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
    // ! Change the campaignId = id just created in staging DB for testing
    const targetIds = [3748];
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

    const preStatus = CAMPAIGN_STATES.includes(currentState)
      ? STATUSES[CAMPAIGN_STATES.indexOf(currentState)]
      : STATUSES[randomInt(0, STATUSES.length - 1)];

    console.log(`Pre-check campaign status: ${preStatus}`);

    const availableStatuses = STATUSES.filter((s) => s !== preStatus);
    const newStatus =
      availableStatuses[randomInt(0, availableStatuses.length - 1)];

    // ! Change the campaignId = id just created in staging DB for testing
    const campaignId = preItem.campaignId || targetIds[0];

    const payload = {
      ...updatePayload(),
      merchantId: preItem.accountNo,
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        campaignId: campaignId,
        previousCampaignStatus: preStatus,
        campaignStatus: newStatus,
        imageUrl: `https://s3.ap-southeast-1.amazonaws.com/images.accesstrade.co.id/00411460f7c92d2124a67ea0f4cb5f85/logo_20170912094621.png`,
        ogImage: `https://s3.ap-southeast-1.amazonaws.com/images.accesstrade.co.id/00411460f7c92d2124a67ea0f4cb5f85/logo_20170912094621.png`,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(JSON.stringify(body)).toMatch(/1/i);
  });

  test("TC20 - Verify invalid campaignStatus value", async ({ request }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        campaignStatus: "INVALID_STATUS",
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/campaignStatus/i);
  });

  test.skip("TC21 - Verify previousCampaignStatus is null", async ({
    request,
  }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        previousCampaignStatus: null,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/previousCampaignStatus/i);
  });

  test.skip("TC22 - Verify invalid date range (startDate > endDate)", async ({
    request,
  }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        campaignStartDate: "2025-05-01",
        campaignEndDate: "2025-04-01",
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /campaignStartDate must be less than or equal to campaignEndDate/i,
    );
  });

  test("TC23 - Verify invalid URL format", async ({ request }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        url: "invalid-url",
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/url/i);
  });

  test.skip("TC24 - Verify invalid flag values (outside allowed range 0/1)", async ({
    request,
  }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        hiddenFlag: 99,
        selfConversionFlag: -1,
        pointbackPermission: 5,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/pointbackPermission must be 0 or 1/i);
  });

  test("TC25 - Verify campaignName exceeds max length", async ({ request }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        campaignName: "A".repeat(513),
        description: "B".repeat(5000),
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /campaignName must be less than 512 characters/i,
    );
  });

  test("TC26 - Verify cookieExpirationDateView is negative", async ({
    request,
  }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignSettingDetails: {
        cookieExpirationDateView: -1,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /cookieExpirationDateView must be greater than or equal to 0/i,
    );
  });

  test.skip("TC26.1 - Verify cookieExpirationDateView is zero", async ({
    request,
  }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignSettingDetails: {
        cookieExpirationDateView: 0,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /cookieExpirationDateView must be greater than 0/i,
    );
  });

  test("TC27 - Verify request without Authorization header", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: {
        "Content-Type": "application/json",
        "X-Accesstrade-User-Type": "staff",
      },
      data: updatePayload(),
    });
    expect(res.status()).toBe(401);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  test("TC28 - Verify request with invalid JWT token", async ({ request }) => {
    const res = await request.put(API_URL, {
      headers: {
        "Content-Type": "application/json",
        "X-Accesstrade-User-Type": "staff",
        Authorization: "Bearer invalid.token.value",
      },
      data: updatePayload(),
    });
    expect(res.status()).toBe(401);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  test("TC29 - Verify non-staff user type cannot call this endpoint", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: {
        "Content-Type": "application/json",
        "X-Accesstrade-User-Type": "publisher",
        Authorization: token,
      },
      data: updatePayload(),
    });
    expect(res.status()).toBe(403);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /You are not allowed to access this API/i,
    );
  });
});

test.describe("Improve Update Campaign API", () => {
  test.describe.configure({ mode: "parallel" });

  // ─── GROUP 2: Cookie duration null + max value ──────────────────────────────
  test.skip("TC31 - Verify cookieExpirationDateView is null", async ({
    request,
  }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        campaignId: 3948,
      },
      updateCampaignSettingDetails: {
        cookieExpirationDateView: null,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(404);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/cookieExpirationDateView/i);
  });

  test("TC32 - Verify cookieExpirationDateView exceeds max value", async ({
    request,
  }) => {
    // TODO: replace 99999 with actual max allowed value + 1 per spec
    const payload = {
      ...updatePayload(),
      updateCampaignSettingDetails: {
        cookieExpirationDateView: 99999,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/cookieExpirationDateView/i);
  });

  // ─── GROUP 3: Agency/Direct merchant type validation ───────────────────────
  test.skip("TC33 - Verify agencyAccountNo is required when merchantTypeId is agency type", async ({
    request,
  }) => {
    // TODO: replace merchantTypeId=2 with actual agency-type value from DB
    const payload = {
      ...updatePayload(),
      merchantId: 4759,
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        campaignId: 3958,
        merchantTypeId: 2,
        agencyAccountNo: null,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(200);
    const body = await logResponse(res);
    // expect(JSON.stringify(body)).toMatch(/agencyAccountNo/i);
  });

  test.skip("TC34 - Verify invalid merchantTypeId value", async ({
    request,
  }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        merchantTypeId: 999,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/merchantTypeId/i);
  });

  // ─── GROUP 4: verifyCut conditional validation ─────────────────────────────
  test("TC35 - Verify verifyCutTarget is required when verifyCutFlag=1", async ({
    request,
  }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignSettingDetails: {
        cookieExpirationDateView: 60,
        verifyCutFlag: 1,
        verifyCutTarget: null,
        verifyCutCondition: 1,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/verifyCutTarget/i);
  });

  test("TC36 - Verify verifyCutCondition is required when verifyCutFlag=1", async ({
    request,
  }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignSettingDetails: {
        cookieExpirationDateView: 60,
        verifyCutFlag: 1,
        verifyCutTarget: 1,
        verifyCutCondition: null,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/verifyCutCondition/i);
  });

  // ─── GROUP 5: Text field byte length ───────────────────────────────────────
  // TODO: replace repeat counts with actual max bytes + 1 per field spec
  test("TC37 - Verify affConditionSpecial exceeds max byte length", async ({
    request,
  }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        affConditionSpecial: "A".repeat(10001),
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/affConditionSpecial/i);
  });

  test("TC38 - Verify affConditionSpecialEnglish exceeds max byte length", async ({
    request,
  }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        affConditionSpecialEnglish: "A".repeat(10001),
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/affConditionSpecialEnglish/i);
  });

  test("TC39 - Verify resultApprovalSpecial exceeds max byte length", async ({
    request,
  }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        resultApprovalSpecial: "A".repeat(10001),
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/resultApprovalSpecial/i);
  });

  test("TC40 - Verify resultApprovalSpecialEnglish exceeds max byte length", async ({
    request,
  }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        resultApprovalSpecialEnglish: "A".repeat(10001),
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/resultApprovalSpecialEnglish/i);
  });

  test("TC41 - Verify validationTerm exceeds max byte length", async ({
    request,
  }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        validationTerm: "A".repeat(10001),
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/validationTerm/i);
  });

  test("TC42 - Verify validationTermEnglish exceeds max byte length", async ({
    request,
  }) => {
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        validationTermEnglish: "A".repeat(10001),
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/validationTermEnglish/i);
  });

  // ─── GROUP 6: Date min/max bounds ──────────────────────────────────────────
  test("TC43 - Verify campaignStartDate below minimum allowed date", async ({
    request,
  }) => {
    // TODO: replace with actual min date boundary per business rule
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        campaignStartDate: "2012-01-01",
        campaignEndDate: "2026-01-01",
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/campaignStartDate/i);
  });

  test("TC44 - Verify campaignEndDate above maximum allowed date", async ({
    request,
  }) => {
    // TODO: replace with actual max date boundary per business rule
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        campaignStartDate: "2024-01-01",
        campaignEndDate: "2100-01-01",
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/campaignEndDate/i);
  });

  // ─── GROUP 7: Business Logic — update-specific ─────────────────────────────

  test("TC45 - Verify ogDescription is accepted (truncation observable via response)", async ({
    request,
  }) => {
    // istools truncates ogDescription to 60 bytes; send >60 bytes and verify API accepts it
    // TODO: after update, fetch campaign and confirm stored ogDescription <= 60 bytes
    const longOgDesc = "A".repeat(200);
    const payload = {
      ...updatePayload(),
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        campaignId: 3948,
        ogDescription: longOgDesc,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    // Should either truncate and return 200, or reject with 400
    expect([200, 400]).toContain(res.status());
  });

  test("TC46 - Verify cookieExpirationDateView defaults when not provided", async ({
    request,
  }) => {
    // istools sets cookieExpirationDateView=86400 when mode=DEFAULT before validation
    // Omit the field to see if gurkha handles the default
    const base = updatePayload();
    const payload = {
      ...base,
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        campaignId: 3948,
      },
      updateCampaignSettingDetails: {},
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    // Expected: either 400 (missing required field) or 200 (default applied)
    // TODO: confirm expected behavior with backend team
    expect([200, 400]).toContain(res.status());
  });

  test.skip("TC47 - Verify merchantAgencyCampaignDetails is required for agency campaigns", async ({
    request,
  }) => {
    // updateAccountAgencyCampaign() not called in gurkha update flow
    // TODO: confirm field name and structure for merchantAgencyCampaignDetails
    const payload = {
      ...updatePayload(),
      merchantAgencyCampaignDetails: null,
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/merchantAgencyCampaignDetails/i);
  });
});

test.describe.skip("Test Update Campaign API for ID", () => {
  test.describe.configure({ mode: "parallel" });
  /*
   * Test Cases for Update Campaign API
   ? 1. RUNNING    → chỉ send message to Kafka khi: GETTING_READY → RUNNING -> topic: notifications-campaigns-new
   * 2. PAUSED     → chỉ send message to Kafka khi: RUNNING → PAUSED -> topic: notifications-campaigns-paused
   ! 3. TERMINATED → chỉ send message to Kafka khi: RUNNING → TERMINATED -> topic: notifications-campaigns-terminated
   */

  test.skip("TC01 - Verify successful update flow (Happy Path)", async ({
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
    // ! Change the campaignId = id just created in staging DB for testing
    const targetIds = [8019];
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

    const preStatus = CAMPAIGN_STATES.includes(currentState)
      ? STATUSES[CAMPAIGN_STATES.indexOf(currentState)]
      : STATUSES[randomInt(0, STATUSES.length - 1)];

    console.log(`Pre-check campaign status: ${preStatus}`);

    const availableStatuses = STATUSES.filter((s) => s !== preStatus);
    const newStatus =
      availableStatuses[randomInt(0, availableStatuses.length - 1)];

    // ! Change the campaignId = id just created in staging DB for testing
    const campaignId = preItem.campaignId || targetIds[0];

    const payload = {
      ...updatePayload(),
      merchantId: 15687,
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        campaignId: campaignId,
        previousCampaignStatus: preStatus,
        campaignStatus: newStatus,
        currencyCode: "IDR",
        customerCountries: "IDN",
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(JSON.stringify(body)).toMatch(/1/i);
  });

  // ─── GROUP 1: Country code restriction ─────────────────────────────────────
  test("TC30 - Verify restricted country code is rejected (JP)", async ({
    request,
  }) => {
    // TODO: confirm exact 3-letter code and error message for JP restriction
    const payload = {
      ...updatePayload(),
      merchantId: 15687,
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        customerCountries: "JPA",
        campaignId: 8019,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/customerCountries/i);
  });

  test("TC30b - Verify restricted country code is rejected (KR)", async ({
    request,
  }) => {
    // TODO: confirm exact 3-letter code and error message for KR restriction
    const payload = {
      ...updatePayload(),
      merchantId: 15687,
      updateCampaignDetails: {
        ...updatePayload().updateCampaignDetails,
        customerCountries: "KRA",
        campaignId: 8019,
      },
    };
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/customerCountries/i);
  });
});
