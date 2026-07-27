import { test, expect } from "@playwright/test";
import {
  randomAddress,
  randomInt,
  randomPhoneNumber,
  randomString,
  randomUserEmail,
} from "@shared/utils/function-helper";
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

const API_URL = `${baseURL}/v1/staff/merchant`;

const token = `Bearer ${generateJWT(USER_UID_VN, SECRET_KEY_VN)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);
const getRestrictedAuthHeaders = () => createStaffHeaders(restrictedToken);

const basicPayload = () => {
  const regixString = randomString(8);
  const loginName = regixString.toLowerCase();
  return {
    merchantId: randomInt(4670, 4680),
    corporateName: `Update Merchant - ${regixString}`,
    fosterEmail: randomUserEmail(loginName),
    loginName: loginName,
    loginPassword: `Test@12345`,
    accountantEmail: randomUserEmail(loginName),
    merchantTypeId: 1,
    staffLoginName: "obs-dev@interspace.ne.jp",
    countryCode: "VN",
    parentMerchantId: 0,
    permissionIds: [1, 2],
  };
};

const validPayload = () => {
  const regixString = randomString(8);
  const loginName = regixString.toLowerCase();
  return {
    merchantId: randomInt(4670, 4680),
    corporateName: `Update Merchant - ${regixString}`,
    corporateZipCode: "10000",
    corporatePrefecture: "VietNam",
    corporateCity: "HCM",
    corporateAddress: randomAddress(),
    corporateAddress2: "Building A",
    corporatePhone: randomPhoneNumber("0"),
    corporateFax: randomPhoneNumber("0"),
    corporateDirectorName: "Director Name",
    corporateRemark: "remark",
    fosterLastname: "FosterLast",
    fosterFirstname: "FosterFirst",
    fosterMiddlename: "FosterMiddle",
    fosterZipCode: "10000",
    fosterPrefecture: "VietNam",
    fosterCity: "HCM",
    fosterAddress: randomAddress(),
    fosterAddress2: "Building B",
    fosterSectionName: "section",
    fosterPostName: "post",
    fosterEmail: randomUserEmail(loginName),
    fosterPhone: randomPhoneNumber("0"),
    fosterFax: randomPhoneNumber("0"),
    fosterRemark: "foster remark",
    loginName: loginName,
    loginPassword: `Test@12345`,
    merchantTypeId: 1,
    staffLoginName: "obs-dev@interspace.ne.jp",
    accountantLastname: `Test Last Name - ${regixString}`,
    accountantFirstname: `Test First Name - ${regixString}`,
    accountantMiddlename: `Test Middle Name - ${regixString}`,
    accountantEmail: randomUserEmail(loginName),
    accountantPhone: randomPhoneNumber("0"),
    countryCode: "VN",
    parentMerchantId: 0,
    permissionIds: [1, 2],
  };
};

test.describe("Update Merchant Account API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Update Merchant Account API Method PUT /v1/staff/merchant
   *
   * Test summary coverage:
   * 1. Authentication failure with invalid token
   * 2. Authorization failure for restricted user
   * 3. Validation error null body
   * 4. Validation error missing required fields
   * 5. Validation error invalid field formats
   * 6. Successful update with valid payload
   * 6.1 Successful update with only required fields
   * 7. Update non-existent merchant account
   * 8. Update with duplicate login name
   * 9. Update with duplicate foster email
   * 10. Update with duplicate accountant email
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
      data: basicPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_02 ──────────────────────────────────────────────────────────────────
  test("TC_02 - Authorization failure (restricted user) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    // staff account that has no permission to update merchants in staging DB
    const res = await request.put(API_URL, {
      headers: getRestrictedAuthHeaders(),
      data: basicPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_03 ──────────────────────────────────────────────────────────────────
  test("TC_03 - Null body - Expect 400 Bad Request", async ({ request }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: null,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/Body is missing/i);
  });

  // ─── TC_04a ─────────────────────────────────────────────────────────────────
  test("TC_04a - Missing required field merchantId - Expect 400 Bad Request", async ({
    request,
  }) => {
    const { merchantId, ...payload } = basicPayload();
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/merchantId is invalid./i);
  });

  // ─── TC_04b ─────────────────────────────────────────────────────────────────
  test("TC_04b - Missing required field loginName - Expect 400 Bad Request", async ({
    request,
  }) => {
    const { loginName, ...payload } = basicPayload();
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(
      /LoginName must not be null or empty/i,
    );
  });

  // ─── TC_04c ─────────────────────────────────────────────────────────────────
  test.skip("TC_04c - Missing required field countryCode - Expect 400 Bad Request", async ({
    request,
  }) => {
    const { countryCode, ...payload } = basicPayload();
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(
      /CountryCode must not be null or empty/i,
    );
  });

  // ─── TC_05a ─────────────────────────────────────────────────────────────────
  test("TC_05a - Invalid email format (fosterEmail) - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: { ...validPayload(), fosterEmail: "not-a-valid-email" },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/FosterEmail is invalid/i);
  });

  // ─── TC_05b ─────────────────────────────────────────────────────────────────
  test("TC_05b - Invalid phone format (fosterPhone) - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: { ...validPayload(), fosterPhone: "INVALID_PHONE" },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/fosterPhone is invalid./i);
  });

  // ─── TC_06 ──────────────────────────────────────────────────────────────────
  test("TC_06 - Successful update with full valid payload - Expect 200 OK", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
  });

  // ─── TC_06.1 ────────────────────────────────────────────────────────────────
  test("TC_06.1 - Successful update with only required fields - Expect 200 OK", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: basicPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
  });

  // ─── TC_07 ──────────────────────────────────────────────────────────────────
  test("TC_07 - Update non-existent merchant account - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: { ...basicPayload(), merchantId: 999999999 },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/merchantId is not exist./i);
  });

  // ─── TC_08 ──────────────────────────────────────────────────────────────────
  test("TC_08 - Update with duplicate loginName - Expect 400", async ({
    request,
  }) => {
    const duplicateLoginName = "merchant_test";
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: { ...basicPayload(), loginName: duplicateLoginName },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/Login name is already in use/i);
  });

  // ─── TC_09 ──────────────────────────────────────────────────────────────────
  test.skip("TC_09 - Update with duplicate fosterEmail - Expect 400", async ({
    request,
  }) => {
    const duplicateEmail = "s_suganami@interspace.ne.jp";
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: { ...basicPayload(), fosterEmail: duplicateEmail },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/fosterEmail is already in use/i);
  });

  // ─── TC_10 ──────────────────────────────────────────────────────────────────
  test.skip("TC_10 - Update with duplicate accountantEmail - Expect 400", async ({
    request,
  }) => {
    const duplicateEmail = "existing_accountant_email@placeholder.com";
    const res = await request.put(API_URL, {
      headers: getAuthHeaders(),
      data: { ...basicPayload(), accountantEmail: duplicateEmail },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/accountantEmail is already in use/i);
  });
});
