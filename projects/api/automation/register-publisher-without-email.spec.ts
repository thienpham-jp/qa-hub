import { test, expect } from "@playwright/test";
import {
  randomEmail,
  randomPhoneNumber,
  randomString,
  randomURL,
} from "@shared/utils/function-helper";
import { urlStagingAPI } from "@shared/utils/base-url-helper";
import { logResponse } from "./helpers/api-test-helper";

const baseURL = urlStagingAPI("VN");

const API_URL = `${baseURL}/v2/publishers/register-without-email`;

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
});

const validPayload = () => ({
  loginName: randomString(10),
  password: "Test@1234",
  accountType: "INDIVIDUAL",
  countryCode: "VN",
  siteName: `Test Site ${randomString(5)}`,
  siteUrl: randomURL(),
  siteStatus: 1,
  agencyId: "123",
  referralId: 456,
  referralUrl: "https://ref.accesstrade.vn/abc",
  utmSource: "isglobal-api",
  utmMedium: "internal",
  utmContent: "signup-v2",
  utmCampaign: "publisher_api_v2",
  utmTerm: "optional",
});

test.describe("Internal Publisher Registration Without Email API V2", () => {
  test.describe.configure({ mode: "parallel" });

  test("TC01 - Verify exception when loginName is null", async ({
    request,
  }) => {
    const payload = { ...validPayload(), loginName: null };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /loginName must not be null or empty/i,
    );
  });

  test("TC02 - Verify exception when password is null", async ({ request }) => {
    const payload = { ...validPayload(), password: null };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /Password must be between 8-16 characters/i,
    );
  });

  test("TC03 - Verify exception when siteName is null", async ({ request }) => {
    const payload = { ...validPayload(), siteName: null };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/siteName must not be null or empty/i);
  });

  test("TC04 - Verify exception when siteUrl is null", async ({ request }) => {
    const payload = { ...validPayload(), siteUrl: null };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/siteUrl must not be null or empty/i);
  });

  test("TC05 - Verify exception when accountType is null", async ({
    request,
  }) => {
    const payload = { ...validPayload(), accountType: null };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /accountType must not be null or empty/i,
    );
  });

  test("TC06 - Verify exception when siteUrl is duplicated", async ({
    request,
  }) => {
    const payload = validPayload();
    await request.post(API_URL, { headers: getAuthHeaders(), data: payload });

    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: {
        ...validPayload(),
        siteUrl: payload.siteUrl,
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/Site url is already in use/i);
  });

  test("TC07 - Verify exception when loginName is duplicated", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: { ...validPayload(), loginName: "chinhtestaccount6" },
    });
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/Login name is already in use/i);
    expect(res.status()).toBe(400);
  });

  test.skip("TC08 - Verify successful registration without email", async ({
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

  test.skip("TC09 - Verify successful registration with email and phoneNumber", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      email: randomEmail(),
      phoneNumber: randomPhoneNumber("0"),
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(typeof body).toBe("number");
    expect(body).toBeGreaterThan(0);
  });

  test("TC10 - Verify exception when email is duplicated", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: { ...validPayload(), email: "mynguyen4@interspace.vn" },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/Email is already in use/i);
  });

  test("TC11 - Verify loginName shorter than 5 characters", async ({
    request,
  }) => {
    const payload = { ...validPayload(), loginName: "ab1d" };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /Login name is not between 6-64 chars/,
    );
  });

  test("TC12 - Verify loginName longer than 64 characters", async ({
    request,
  }) => {
    const payload = { ...validPayload(), loginName: randomString(65) };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /Login name is not between 6-64 chars/,
    );
  });

  test("TC13 - Verify loginName with invalid special characters", async ({
    request,
  }) => {
    const payload = { ...validPayload(), loginName: "!*&%ass" };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /Login name contains invalid characters/i,
    );
  });

  test.skip("TC14 - Verify loginName with valid allowed characters", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      loginName: `valid_user-${randomString(5)}`,
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(typeof body).toBe("number");
    expect(body).toBeGreaterThan(0);
  });

  // ? If countryCode is null, get default country code from system
  test.skip("TC15 - Verify null or empty countryCode", async ({ request }) => {
    const payload = { ...validPayload(), countryCode: null };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/Country Code is required/i);
  });

  test("TC16 - Verify invalid countryCode outside allowed list", async ({
    request,
  }) => {
    const payload = { ...validPayload(), countryCode: "XX" };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/countryCode is invalid/i);
  });

  for (const countryCode of ["ID", "TH", "VN"]) {
    test.skip(`TC17 - Verify valid countryCode: ${countryCode}`, async ({
      request,
    }) => {
      const payload = { ...validPayload(), countryCode };
      const res = await request.post(API_URL, {
        headers: getAuthHeaders(),
        data: payload,
      });
      const body = await logResponse(res);
      expect(res.status()).toBe(200);
      expect(typeof body).toBe("number");
      expect(body).toBeGreaterThan(0);
    });
  }

  test("TC18 - Verify invalid email format", async ({ request }) => {
    const payload = { ...validPayload(), email: "not-an-email" };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/email is invalid/i);
  });

  test("TC19 - Verify invalid phoneNumber format", async ({ request }) => {
    const payload = { ...validPayload(), phoneNumber: randomString(5) };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /Invalid Phone number format, only accepts numbers/i,
    );
  });

  test.skip("TC20 - Verify registration without email and phoneNumber", async ({
    request,
  }) => {
    const { email: _e, phoneNumber: _p } = {
      ...validPayload(),
      email: undefined,
      phoneNumber: undefined,
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(typeof body).toBe("number");
    expect(body).toBeGreaterThan(0);
  });

  test.skip("TC21 - Verify registration with email and phoneNumber", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      email: randomEmail(),
      phoneNumber: randomPhoneNumber(),
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(typeof body).toBe("number");
    expect(body).toBeGreaterThan(0);
  });

  test("TC22 - Verify duplicate validation combinations (loginName + siteUrl)", async ({
    request,
  }) => {
    const payload = validPayload();
    await request.post(API_URL, { headers: getAuthHeaders(), data: payload });

    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: {
        ...validPayload(),
        loginName: payload.loginName,
        siteUrl: payload.siteUrl,
      },
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(/Site url is already in use/i);
  });

  test.skip("TC23 - Verify account status after successful registration (DB check)", async () => {
    // Requires DB access: verify status = ACTIVE and siteStatus = APPROVED
  });

  test.skip("TC24 - Verify hashedActivationCode is NULL after registration (DB check)", async () => {
    // Requires DB access: verify hashedActivationCode = NULL
  });

  test.skip("TC25 - Verify no activation records are created (DB check)", async () => {
    // Requires DB access: verify no records in activation-related tables
  });

  test.skip("TC26 - Verify V1 public signup flow is not affected", async () => {
    // Verify public signup via V1 still requires activation flow (manual/separate test)
  });

  test.skip("TC27 - Verify API access is restricted to internal usage", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(200).toContain(res.status());
  });

  // password without special character
  test.skip("TC28 - Verify password without special character", async ({
    request,
  }) => {
    const payload = { ...validPayload(), password: "Test1234" };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /Password must be between 8-16 characters and must contain at least one lowercase letter, one uppercase letter, one number, and one special character./i,
    );
  });

  test.skip("TC29 - Verify password invalid secure", async ({ request }) => {
    const payload = { ...validPayload(), password: "12345678" };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /Password must be between 8-16 characters and must contain at least one lowercase letter, one uppercase letter, one number, and one special character./i,
    );
  });

  test("TC30 - Verify password shorter than 8 characters", async ({
    request,
  }) => {
    const payload = { ...validPayload(), password: "T@1a" };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /Password must be between 8-16 characters/i,
    );
  });

  test("TC31 - Verify password longer than 32 characters", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      password: "Test@123456789012345678901234567890123",
    };
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: payload,
    });
    expect(res.status()).toBe(400);
    const body = await logResponse(res);
    expect(JSON.stringify(body)).toMatch(
      /Password must be between 8-16 characters/i,
    );
  });
});
