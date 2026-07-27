import { test, expect } from "@playwright/test";
import {
  randomDateString,
  randomImageBase64,
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

const basicPayload = () => ({
  insertCampaignDetails: {
    merchantId: randomInt(1760, 2300),
    campaignStatus: "RUNNING",
    category1: 1,
    category2: 2,
    category3: 3,
    campaignName: `Campaign Test - ${randomString(5)} ${randomInt(1000, 9999)}`,
    campaignType: campaignTypes[randomInt(0, campaignTypes.length - 1)],
    url: randomURL(),
    deviceTypes: "PC,Android,iPhone,Android Tablet,iPad",
    getParameterFlag: "SOCKET",
    pointbackPermission: 1,
    selfConversionFlag: 1,
    hiddenFlag: 0,
    offerCode: "OFFER123",
    campaignStartDate: sDate,
    campaignEndDate: eDate,
    currency: "VND",
    hideClickReferrer: 0,
    adPlatformId: 0,
    createdBy: "obs-dev@interspace.ne.jp",
    integratedCampaignId: null,
    integratedCountryCode: null,
    isRewardsByCategoriesVisible: true,
    customerCountries: "VNM",
    campaignApplication: "WEB_AND_MOBILE_APP", // WEB_ONLY(1), MOBILE_APP_ONLY(2), WEB_AND_MOBILE_APP(3);
    imageUrl:
      "https://s3-ap-southeast-1.amazonaws.com/images.accesstrade.vn/1c67df9e0a5cfefa030b853983324004/logo_20230614032335.png",
    isAlternativeLinkUsed: 0,
    ogDescription: "OG description",
    ogImage: `https://s3-ap-southeast-1.amazonaws.com/images.accesstrade.vn/1c67df9e0a5cfefa030b853983324004/logo_20230614032335.png`,
  },
  categoryIds: [1, 2, 3],
  insertCampaignSettingDetails: {
    cvOnlyOnceFlag: 1,
    cookieExpirationDateView: 60,
    verifyCutFlag: 0,
    verifyCutTarget: 0,
    verifyCutCondition: 0,
  },
  campaignLogoImageBase64: randomImageBase64(),
});

const validPayload = () => ({
  insertCampaignDetails: {
    merchantId: randomInt(1760, 2300),
    campaignStatus: "RUNNING",
    category1: 1,
    category2: 2,
    category3: 3,
    campaignName: `Campaign Test - ${randomString(5)} ${randomInt(1000, 9999)}`,
    campaignType: campaignTypes[randomInt(0, campaignTypes.length - 1)],
    url: randomURL(),
    description: randomSentence(50),
    descriptionEnglish: randomSentence(15),
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
    currency: "VND",
    hideClickReferrer: 0,
    adPlatformId: 0,
    createdBy: "obs-dev@interspace.ne.jp",
    integratedCampaignId: null,
    integratedCountryCode: null,
    isRewardsByCategoriesVisible: true,
    customerCountries: "VNM",
    affConditionSpecialEnglish: "EN required actions",
    resultApprovalSpecialEnglish: "EN result approval",
    validationTerm: "Local validation",
    validationTermEnglish: "EN validation",
    trafficRestrictions: "Restrictions text",
    campaignApplication: "WEB_AND_MOBILE_APP", // WEB_ONLY(1), MOBILE_APP_ONLY(2), WEB_AND_MOBILE_APP(3);
    imageUrl:
      "https://s3-ap-southeast-1.amazonaws.com/images.accesstrade.vn/1c67df9e0a5cfefa030b853983324004/logo_20230614032335.png",
    isAlternativeLinkUsed: 0,
    ogDescription: "OG description",
    ogImage:
      "https://s3-ap-southeast-1.amazonaws.com/images.accesstrade.vn/1c67df9e0a5cfefa030b853983324004/logo_20230614032335.png",
  },
  categoryIds: [1, 2, 3],
  insertCampaignSettingDetails: {
    cvOnlyOnceFlag: 1,
    cookieExpirationDateView: 60,
    verifyCutFlag: 0,
    verifyCutTarget: 0,
    verifyCutCondition: 0,
  },
  campaignLogoImageBase64: randomImageBase64(),
});

test.describe("Create New Campaign API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Create New Campaign API
   * 
    ID	Case Summary	Expected Result	Actual Result
    TC01	Verify invalid / empty request body	Return 400 with message: "Body is missing"	"Body is missing"
    TC01.1	Verify insertCampaignDetails is missing in request body	Return 400 with message: "insertCampaignDetails is missing"	"insertCampaignDetails is missing"
    TC02	Verify merchantId is null	Return 400 with required field validation error	Matches expected result
    TC02.1	Verify merchantId does not exist	Return 400 with message: "merchantId does not exist"	Matches expected result
    TC02.2	Verify merchantId is negative	Return 400 with message: "merchantId must be greater than 0"	Matches expected result
    TC03	Verify insertCampaignDetails is null	Return 400 with message: "insertCampaignDetails is missing"	Matches expected result
    TC04	Verify campaignType is null	Return 400 with required field validation error	Matches expected result
    TC05	Verify campaignStatus is null	Return 400 with required field validation error	Matches expected result
    TC06	Verify campaignApplication is null	Return 400 with required field validation error	Matches expected result
    TC07	Verify campaignName is empty	Return 400 with required field validation error	Matches expected result
    TC08	Verify url is empty	Return 400 with required field validation error	Matches expected result
    TC09	Verify deviceTypes is empty	Return 400 with required field validation error	Matches expected result
    TC10	Verify getParameterFlag is null	Return 400 with required field validation error	Matches expected result
    TC11	Verify customerCountries is empty	Return 400 with required field validation error	Matches expected result
    TC12	Verify successful campaign creation (Basic)	Return 200 with inserted count according to spec	New campaignId returned
    TC13	Verify successful creation with all optional fields	Campaign created successfully with description, category, currency, dates, etc.	N/A
    TC14	Verify invalid date range	Return 400 when startDate > endDate	N/A
    TC15	Verify invalid URL format	Return 400 for invalid URL format	N/A
    TC16	Verify invalid flag values	Return validation error when flag values are outside allowed range (0/1)	N/A
    TC17	Verify character limit validation	Return validation error when campaign name or description exceeds max length	N/A
    TC18	Verify logical constraint for auto action duration	Return validation error for negative or invalid auto action duration	N/A
    TC19	Verify logical constraint for auto action duration (0)	Return validation error if 0 is not allowed for auto action duration	N/A
   */

  test("TC01 - Verify invalid / empty request body", async ({ request }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: null,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/Body is missing/i);
  });

  test("TC01.1 - Verify insertCampaignDetails is missing in request body", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: {},
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/insertCampaignDetails is missing/i);
  });

  test("TC02 - Verify merchantId is null", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        merchantId: null,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/Merchant ID is invalid/i);
  });

  test("TC02.1 - Verify merchantId does not exist", async ({ request }) => {
    const merchantId = 6555545; // Giả sử ID này không tồn tại trong hệ thống
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        merchantId: merchantId,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      new RegExp(`Merchant \\[${merchantId}\\] does not exist.`, "i"),
    );
  });

  test("TC02.2 - Verify merchantId = 0 or is negative", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        merchantId: 0,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/Merchant ID is invalid/i);
  });

  test("TC03 - Verify insertCampaignDetails is null", async ({ request }) => {
    const payload = { ...validPayload(), insertCampaignDetails: null };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/insertCampaignDetails is missing/i);
  });

  test("TC04 - Verify campaignType is null", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        campaignType: null,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/campaignType/i);
  });

  test("TC05 - Verify campaignStatus is null", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        campaignStatus: null,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/campaignStatus/i);
  });

  test("TC06 - Verify campaignApplication is null", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        campaignApplication: null,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/campaignApplication/i);
  });

  test("TC07 - Verify campaignName is empty", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        campaignName: "",
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/campaignName/i);
  });

  test("TC08 - Verify url is empty", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        url: "",
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/url/i);
  });

  test("TC09 - Verify deviceTypes is empty", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        deviceTypes: "",
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/deviceTypes/i);
  });

  test("TC10 - Verify getParameterFlag is null", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        getParameterFlag: null,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/getParameterFlag/i);
  });

  test("TC11 - Verify customerCountries is empty", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        customerCountries: "",
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/customerCountries/i);
  });

  test.skip("TC12 - Verify successful campaign creation (Basic)", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: basicPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(typeof body).toBe("number");
    expect(body).toBeGreaterThan(0);
  });

  test.skip("TC13 - Verify successful creation with all optional fields", async ({
    request,
  }) => {
    const payload = validPayload();
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(typeof body).toBe("number");
    expect(body).toBeGreaterThan(0);
  });

  test("TC14 - Verify invalid date range (startDate > endDate)", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        campaignStartDate: "2025-05-01",
        campaignEndDate: "2025-04-01",
        startDate: "2025-05-01",
        endDate: "2025-04-01",
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /campaignStartDate must be less than or equal to campaignEndDate./i,
    );
  });

  test("TC15 - Verify invalid URL format", async ({ request }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        url: "invalid-url",
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/url must be a valid URL/i);
  });

  test("TC16 - Verify invalid flag values (outside allowed range 0/1)", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        hiddenFlag: 99,
        selfConversionFlag: -1,
        pointbackPermission: 5,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(
      /pointbackPermission must be 0 or 1./i,
    );
  });

  test("TC17 - Verify character limit validation (campaignName exceeds max length)", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        campaignName: "A".repeat(513),
        description: "B".repeat(5000),
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(
      /campaignName must be less than 512 characters/i,
    );
  });

  test("TC18 - Verify logical constraint for auto action duration (negative value)", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      insertCampaignSettingDetails: {
        ...validPayload().insertCampaignSettingDetails,
        cookieExpirationDateView: -1,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /cookieExpirationDateView must be greater than or equal to 0/i,
    );
  });

  // Nếu giá trị 0 không hợp lệ, hãy sửa lại thông điệp lỗi và regex phù hợp
  test.skip("TC19 - Verify logical constraint for auto action duration (0)", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      insertCampaignSettingDetails: {
        ...validPayload().insertCampaignSettingDetails,
        cookieExpirationDateView: 0,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /cookieExpirationDateView must be greater than 0/i,
    );
  });
});

test.describe("Improve Create New Campaign API", () => {
  test.describe.configure({ mode: "parallel" });

  // ─── GROUP 2: Cookie duration null + max value ──────────────────────────────
  test.skip("TC21 - Verify cookieExpirationDateView is null", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      insertCampaignSettingDetails: {
        ...validPayload().insertCampaignSettingDetails,
        cookieExpirationDateView: null,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(200);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/cookieExpirationDateView/i);
  });

  test("TC22 - Verify cookieExpirationDateView exceeds max value", async ({
    request,
  }) => {
    // TODO: replace 99999 with actual max allowed value + 1 per spec
    const payload = {
      ...validPayload(),
      insertCampaignSettingDetails: {
        ...validPayload().insertCampaignSettingDetails,
        cookieExpirationDateView: 99999,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/cookieExpirationDateView/i);
  });

  // ─── GROUP 3: Agency/Direct merchant type validation ───────────────────────
  test.skip("TC23 - Verify agencyAccountNo is required when merchantTypeId is agency type", async ({
    request,
  }) => {
    // TODO: replace merchantTypeId=2 with actual agency-type value from DB
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        merchantId: 4759,
        merchantTypeId: 2,
        agencyAccountNo: null,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(200);
    const body = await logResponse(res);
    // expect(JSON.stringify(body)).toMatch(/agencyAccountNo/i);
  });

  test.skip("TC24 - Verify invalid merchantTypeId value", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        merchantTypeId: 999,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/merchantTypeId/i);
  });

  // ─── GROUP 4: verifyCut conditional validation ─────────────────────────────
  test("TC25 - Verify verifyCutTarget is required when verifyCutFlag=1", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      insertCampaignSettingDetails: {
        ...validPayload().insertCampaignSettingDetails,
        verifyCutFlag: 1,
        verifyCutTarget: null,
        verifyCutCondition: 1,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/verifyCutTarget/i);
  });

  test("TC26 - Verify verifyCutCondition is required when verifyCutFlag=1", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      insertCampaignSettingDetails: {
        ...validPayload().insertCampaignSettingDetails,
        verifyCutFlag: 1,
        verifyCutTarget: 1,
        verifyCutCondition: null,
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/verifyCutCondition/i);
  });

  // ─── GROUP 5: Text field byte length ───────────────────────────────────────
  // TODO: replace repeat counts with actual max bytes + 1 per field spec
  test("TC27 - Verify affConditionSpecial exceeds max byte length", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        affConditionSpecial: "A".repeat(10001),
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/affConditionSpecial/i);
  });

  test("TC28 - Verify affConditionSpecialEnglish exceeds max byte length", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        affConditionSpecialEnglish: "A".repeat(10001),
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/affConditionSpecialEnglish/i);
  });

  test("TC29 - Verify resultApprovalSpecial exceeds max byte length", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        resultApprovalSpecial: "A".repeat(10001),
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/resultApprovalSpecial/i);
  });

  test("TC30 - Verify resultApprovalSpecialEnglish exceeds max byte length", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        resultApprovalSpecialEnglish: "A".repeat(10001),
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/resultApprovalSpecialEnglish/i);
  });

  test("TC31 - Verify validationTerm exceeds max byte length", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        validationTerm: "A".repeat(10001),
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/validationTerm/i);
  });

  test("TC32 - Verify validationTermEnglish exceeds max byte length", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        validationTermEnglish: "A".repeat(10001),
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/validationTermEnglish/i);
  });

  // ─── GROUP 6: Date min/max bounds ──────────────────────────────────────────
  test("TC33 - Verify campaignStartDate below minimum allowed date", async ({
    request,
  }) => {
    // TODO: replace with actual min date boundary per business rule
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        campaignStartDate: "2012-11-01",
        campaignEndDate: "2026-01-01",
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/campaignStartDate/i);
  });

  test("TC34 - Verify campaignEndDate above maximum allowed date", async ({
    request,
  }) => {
    // TODO: replace with actual max date boundary per business rule
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        campaignStartDate: "2024-01-01",
        campaignEndDate: "2100-01-01",
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/campaignEndDate/i);
  });
});

test.describe.skip("Test Create New Campaign API for ID", () => {
  // * Create campaign with status = RUNNING, send message to Kafka topic, check message in topic: notifications-campaigns-new
  test.skip("TC13 - Verify successful creation with all optional fields", async ({
    request,
  }) => {
    const payload = validPayload();
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: {
        ...payload,
        insertCampaignDetails: {
          ...payload.insertCampaignDetails,
          campaignName: `Thien Test Campaign Socket - ${randomString(5)}`,
          url: "https://lambent-mermaid-adc381.netlify.app/socket-landing.html?click_id={clickid}",
          merchantId: 15691,
          currency: "IDR",
          customerCountries: "IDN",
          getParameterFlag: "SOCKET",
        },
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(typeof body).toBe("number");
    expect(body).toBeGreaterThan(0);
  });

  // ─── GROUP 1: Country code restriction ─────────────────────────────────────
  test("TC20 - Verify restricted country code is rejected (JP)", async ({
    request,
  }) => {
    // TODO: confirm exact 3-letter code and error message for JP restriction
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        merchantId: 15691,
        customerCountries: "JPA",
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/customerCountries/i);
  });

  test("TC20b - Verify restricted country code is rejected (KR)", async ({
    request,
  }) => {
    // TODO: confirm exact 3-letter code and error message for KR restriction
    const payload = {
      ...validPayload(),
      insertCampaignDetails: {
        ...validPayload().insertCampaignDetails,
        merchantId: 15691,
        customerCountries: "KRA",
      },
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/customerCountries/i);
  });
});
