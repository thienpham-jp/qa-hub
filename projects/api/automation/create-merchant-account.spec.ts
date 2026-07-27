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
    corporateName: `Create Merchant - ${regixString}`,
    fosterEmail: randomUserEmail(loginName),
    loginName: loginName,
    loginPassword: `Test@1234`,
    accountantEmail: randomUserEmail(loginName),
    merchantTypeId: randomInt(1, 2),
    staffLoginName: "obs-dev@interspace.ne.jp",
    countryCode: "ID",
    parentMerchantId: 0,
    // permissionIds: [1, 2],
  };
};

const validPayload = () => {
  const regixString = randomString(8);
  const loginName = regixString.toLowerCase();
  return {
    corporateName: `Create Merchant - ${regixString}`,
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
    loginPassword: `Test@1234`,
    merchantTypeId: 2,
    staffLoginName: "obs-dev@interspace.ne.jp",
    accountantLastname: `Test Last Name - ${regixString}`,
    accountantFirstname: `Test First Name - ${regixString}`,
    accountantMiddlename: `Test Middle Name - ${regixString}`,
    accountantEmail: randomUserEmail(loginName),
    accountantPhone: randomPhoneNumber("0"),
    countryCode: "ID",
    parentMerchantId: 0,
    // permissionIds: [1, 2],
  };
};

test.describe("Create Merchant Account API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Create Merchant Account API Method POST /v1/staff/merchant
   *
   * Test summary coverage:
   * 1. Successful creation with valid payload basic required fields
   * 2. Successful creation with all fields provided
   * 3. Validation errors for missing required fields
   * 4. Validation errors for invalid field formats (email, phone)
   * 5. Authentication failure with invalid token
   * 6. Authorization failure for restricted user
   * 7. Verify duplicate loginName handling
   * 8. Hierarchy handling with parentMerchantId
   * 9. Role Assignment (permissionIds)
   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test.skip("TC_01 - Successful creation with basic required fields - Expect 200 OK", async ({
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

  // ─── TC_02 ──────────────────────────────────────────────────────────────────
  test.skip("TC_02 - Successful creation with all fields provided - Expect 200 OK", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(typeof body).toBe("number");
    expect(body).toBeGreaterThan(0);
  });

  // ─── TC_03a ─────────────────────────────────────────────────────────────────
  test("TC_03a - Missing required field loginName - Expect 400 Bad Request", async ({
    request,
  }) => {
    const { loginName, ...payload } = basicPayload();
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(
      /loginName must not be null or empty/i,
    );
  });

  // ─── TC_03b ─────────────────────────────────────────────────────────────────
  test("TC_03b - Missing required field loginPassword - Expect 400 Bad Request", async ({
    request,
  }) => {
    const { loginPassword, ...payload } = basicPayload();
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/password must not be null or empty/i);
  });

  // ─── TC_03c ─────────────────────────────────────────────────────────────────
  test.skip("TC_03c - Missing required field countryCode - Expect 400 Bad Request", async ({
    request,
  }) => {
    const { countryCode, ...payload } = basicPayload();
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/countryCode is required/i);
  });

  // ─── TC_03d ─────────────────────────────────────────────────────────────────
  test.skip("TC_03d - Invalid countryCode - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: { ...basicPayload(), countryCode: "XX" },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/Bad Request|countryCode|invalid/i);
  });

  // ─── TC_04a ─────────────────────────────────────────────────────────────────
  test("TC_04a - Invalid email format (fosterEmail) - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: { ...validPayload(), fosterEmail: "not-a-valid-email" },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/Email is invalid/i);
  });

  // ─── TC_04b ─────────────────────────────────────────────────────────────────
  test("TC_04b - Invalid phone format (fosterPhone) - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: {
        ...validPayload(),
        fosterPhone: "INVALID_PHONE",
        phone: "INVALID_PHONE",
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/fosterPhone is invalid./i);
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  test("TC_05 - Authentication failure (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: {
        ...getRestrictedAuthHeaders(),
        Authorization: "",
      },
      data: basicPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_06 ──────────────────────────────────────────────────────────────────
  test("TC_06 - Authorization failure (restricted user) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    // staff account that has no permission to create merchants in staging DB
    const res = await request.post(API_URL, {
      headers: getRestrictedAuthHeaders(),
      data: basicPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_07 ──────────────────────────────────────────────────────────────────
  test("TC_07 - Duplicate loginName - Expect 400 or 409 Conflict", async ({
    request,
  }) => {
    const sharedLoginName = `dup_${randomString(6).toLowerCase()}`;

    // First creation — should succeed
    await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: { ...basicPayload(), loginName: sharedLoginName },
    });

    // Second creation with same loginName — should fail
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: { ...basicPayload(), loginName: sharedLoginName },
    });
    const body = await logResponse(res);
    expect([400, 409]).toContain(res.status());
    expect(JSON.stringify(body)).toMatch(/Login name is already in use./i);
  });

  // ─── TC_08 ──────────────────────────────────────────────────────────────────
  test.skip("TC_08 - Valid parentMerchantId (hierarchy) - Expect 200 OK", async ({
    request,
  }) => {
    const parentMerchantId = randomInt(11, 20); // Replace with actual existing merchantId in staging DB for real test
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: { ...basicPayload(), parentMerchantId },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(typeof body).toBe("number");
    expect(body).toBeGreaterThan(0);
  });

  // ─── TC_09 ──────────────────────────────────────────────────────────────────
  test.skip("TC_09 - Empty permissionIds - Expect 200 OK", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: {
        ...basicPayload(),
        loginName: randomString(8).toLowerCase(),
        permissionIds: [],
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(typeof body).toBe("number");
    expect(body).toBeGreaterThan(0);
  });
});
