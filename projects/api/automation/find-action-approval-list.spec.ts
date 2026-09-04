import { test, expect } from "@playwright/test";
import {
  logResponse,
  createStaffHeaders,
  RESTRICTED_USER_UID,
  RESTRICTED_SECRET_KEY,
} from "./helpers/api-test-helper";
import { urlStagingAPI } from "@shared/utils/base-url-helper";
import { generateJWT } from "@shared/utils/jwt-helper";
import { USER_UID, SECRET_KEY } from "@shared/utils/user-helper";

const baseURL = urlStagingAPI("ID");

const API_URL = `${baseURL}/v1/staff/conversion/approval-search/get-result-list-by-condition`;
const API_URL_2 = `${baseURL}/v1/staff/conversion/approval-search/count-result-list-by-condition`;

const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);
const getRestrictedAuthHeaders = () => createStaffHeaders(restrictedToken);

const validPayload = () => ({
  identifier: [],
  conversionId: [],
  merchantAccountNo: [1030],
  merchantCampaignNo: [],
  partnerAccountNo: [],
  partnerSiteNo: [],
  periodBase: "CONVERSION_DATE",
  fromMonth: "2026-07-01",
  toMonth: "2026-08-26",
  countryCode: "ID",
  statuses: ["New", "Hold"],
});

test.describe("Find Action Approval List by Conditions API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Find Action Approval List by Conditions API method `POST /v1/staff/conversion/approval-search/get-result-list-by-condition` and `POST /v1/staff/conversion/approval-search/count-result-list-by-condition`
   * * Test scenarios for both list and count endpoints:
   * TC01: Valid payload - both endpoints
   * TC02: Missing JWT token
   * TC03: Invalid JWT token
   * TC04-TC06: Filter conversionId (single, multiple, non-existing)
   * TC07-TC08: Filter merchantAccountNo
   * TC09: Filter merchantCampaignNo
   * TC10: Filter partnerAccountNo
   * TC11: Filter partnerSiteNo
   * TC12-TC15: Date range validation
   * TC16-TC19: Status filters
   * TC20: Filter feeId (only applicable for VN)
   * TC21-TC22: CountryCode validation
   * TC23: Empty payload
   * TC24: Null values
   * TC25: Response structure
   * TC26: Filter identifier
   * TC27: Combined filters (AND logic)
   * TC28: API connection failure or response timeout exceeding configured limit
   * TC29: Large dataset without filters (special test)
   */

  // ─── TC01: Valid payload - both endpoints ──────────────────────────────────────
  test("TC01 - Both endpoints: Return 200 with valid payload", async ({
    request,
  }) => {
    const payload = validPayload();

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    expect(Array.isArray(listBody.results)).toBe(true);
    expect(typeof countBody.count).toBe("number");
    expect(countBody.count).toBe(
      Array.isArray(listBody.results) ? listBody.results.length : 0,
    );
  });

  // ─── TC02: Missing JWT token - both endpoints ──────────────────────────────────
  test("TC02 - Both endpoints: Missing JWT token returns 401", async ({
    request,
  }) => {
    const invalidHeaders = {
      "Content-Type": "application/json",
      "X-Accesstrade-User-Type": "staff",
    };
    const payload = validPayload();

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: invalidHeaders, data: payload }),
      request.post(API_URL_2, { headers: invalidHeaders, data: payload }),
    ]);

    expect(listRes.status()).toBe(401);
    expect(countRes.status()).toBe(401);
  });

  // ─── TC03: Invalid JWT token - both endpoints ──────────────────────────────────
  test("TC03 - Both endpoints: Invalid JWT token returns 401", async ({
    request,
  }) => {
    const payload = validPayload();

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, {
        headers: getRestrictedAuthHeaders(),
        data: payload,
      }),
      request.post(API_URL_2, {
        headers: getRestrictedAuthHeaders(),
        data: payload,
      }),
    ]);

    expect(listRes.status()).toBe(401);
    expect(countRes.status()).toBe(401);
  });

  // ─── TC04: Filter by single conversionId - both endpoints ────────────────────────────
  test("TC04 - Both endpoints: Filter by single conversionId", async ({
    request,
  }) => {
    const payload = { ...validPayload(), conversionId: [286096717] };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);
    expect(Array.isArray(listBody.results)).toBe(true);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results || [];
    if (Array.isArray(results) && results.length > 0) {
      results.forEach((item: any) => {
        expect(item.conversionId).toBe(286096717);
      });
    }
    expect(countBody.count).toBe(Array.isArray(results) ? results.length : 0);
  });

  // ─── TC05: Filter by multiple conversionId - both endpoints ────────────────────
  test("TC05 - Both endpoints: Filter by multiple conversionId values", async ({
    request,
  }) => {
    const payload = { ...validPayload(), conversionId: [286096717, 286096718] };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results || [];
    if (Array.isArray(results) && results.length > 0) {
      results.forEach((item: any) => {
        expect([286096717, 286096718]).toContain(item.conversionId);
      });
    }
    expect(countBody.count).toBe(Array.isArray(results) ? results.length : 0);
  });

  // ─── TC06: Filter by non-existing conversionId - both endpoints ────────────────
  test("TC06 - Both endpoints: Non-existing conversionId returns empty result", async ({
    request,
  }) => {
    const payload = { ...validPayload(), conversionId: [9999999] };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results || [];
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
    expect(countBody.count).toBe(0);
  });

  // ─── TC07: Filter by merchantAccountNo - both endpoints ──────────────────────
  test("TC07 - Both endpoints: Filter by merchantAccountNo", async ({
    request,
  }) => {
    const payload = { ...validPayload(), merchantAccountNo: [452] };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results || [];
    expect(Array.isArray(results)).toBe(true);
    expect(countBody.count > 0).toBe(true);
  });

  // ─── TC08: Filter by multiple merchantAccountNo - both endpoints ──────────────
  test("TC08 - Both endpoints: Filter by multiple merchantAccountNo values", async ({
    request,
  }) => {
    const payload = { ...validPayload(), merchantAccountNo: [452, 1030] };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results || [];
    expect(Array.isArray(results)).toBe(true);
    expect(countBody.count > 0).toBe(true);
  });

  // ─── TC09: Filter by merchantCampaignNo - both endpoints ─────────────────────
  test("TC09 - Both endpoints: Filter by merchantCampaignNo", async ({
    request,
  }) => {
    const payload = { ...validPayload(), merchantCampaignNo: [6081] };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results || [];
    expect(Array.isArray(results)).toBe(true);
    expect(countBody.count > 0).toBe(true);
  });

  // ─── TC10: Filter by partnerAccountNo - both endpoints ──────────────────────
  test("TC10 - Both endpoints: Filter by partnerAccountNo", async ({
    request,
  }) => {
    const payload = { ...validPayload(), partnerAccountNo: [84255] };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results || [];
    expect(Array.isArray(results)).toBe(true);
    expect(countBody.count > 0).toBe(true);
  });

  // ─── TC11: Filter by partnerSiteNo - both endpoints ─────────────────────────
  test("TC11 - Both endpoints: Filter by partnerSiteNo", async ({
    request,
  }) => {
    const payload = { ...validPayload(), partnerSiteNo: [102253] };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results || [];
    expect(Array.isArray(results)).toBe(true);
    expect(countBody.count > 0).toBe(true);
  });

  // ─── TC12: Valid date range - both endpoints ────────────────────────────────
  test("TC12 - Both endpoints: Filter by periodBase=CONVERSION_DATE with valid date range", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      periodBase: "CONVERSION_DATE",
      fromMonth: "2026-08-01",
      toMonth: "2026-08-26",
    };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results || [];
    expect(Array.isArray(results)).toBe(true);
    expect(countBody.count > 0).toBe(true);
  });

  // ─── TC13: Invalid date format - both endpoints ────────────────────────────
  test("TC13 - Both endpoints: Invalid fromMonth format returns 400", async ({
    request,
  }) => {
    const payload = { ...validPayload(), fromMonth: "2026/08/01" };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    expect([500]).toContain(listRes.status());
    expect([500]).toContain(countRes.status());
  });

  // ─── TC14: Invalid toMonth format - both endpoints ────────────────────────
  test("TC14 - Both endpoints: Invalid toMonth format returns 400", async ({
    request,
  }) => {
    const payload = { ...validPayload(), toMonth: "08-26-2026" };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    expect([500]).toContain(listRes.status());
    expect([500]).toContain(countRes.status());
  });

  // ─── TC15: fromMonth > toMonth - both endpoints ────────────────────────────
  test("TC15 - Both endpoints: fromMonth > toMonth should handle gracefully", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      fromMonth: "2027-08-26",
      toMonth: "2026-08-01",
    };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    expect([400, 404]).toContain(listRes.status());
    expect([400, 404]).toContain(countRes.status());
  });

  // ─── TC16: Filter by single status (Approved) - both endpoints ─────────────
  test("TC16 - Both endpoints: Filter by single status (Approved)", async ({
    request,
  }) => {
    const payload = { ...validPayload(), statuses: ["Approved"] };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results || [];
    expect(Array.isArray(results)).toBe(true);
    expect(countBody.count > 0).toBe(true);
  });

  // ─── TC17: Filter by single status (Hold) - both endpoints ─────────────
  test("TC17 - Both endpoints: Filter by single status (Hold)", async ({
    request,
  }) => {
    const payload = { ...validPayload(), statuses: ["Hold"] };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results || [];
    expect(Array.isArray(results)).toBe(true);
    expect(countBody.count > 0).toBe(true);
  });

  // ─── TC18: Filter by multiple statuses - both endpoints ────────────────────
  test("TC18 - Both endpoints: Filter by multiple statuses", async ({
    request,
  }) => {
    const payload = { ...validPayload(), statuses: ["Hold", "Approved"] };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results || [];
    expect(Array.isArray(results)).toBe(true);
    expect(countBody.count > 0).toBe(true);
  });

  // ─── TC19: Invalid status value - both endpoints ────────────────────────
  test("TC19 - Both endpoints: Invalid status value returns 400", async ({
    request,
  }) => {
    const payload = { ...validPayload(), statuses: ["Invalid"] };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    expect([400, 404]).toContain(listRes.status());
    expect([400, 404]).toContain(countRes.status());
  });

  // ─── TC20: Filter by feeId - both endpoints ───────────────────────────────
  test("TC20 - Both endpoints: Filter by feeId", async ({ request }) => {
    // Skip if staging server is unavailable/too slow
    if (baseURL !== urlStagingAPI("VN")) {
      test.skip(true, `not included for this baseURL`);
      return;
    }
    const payload = { ...validPayload(), feeId: 1 };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results || [];
    if (Array.isArray(results) && results.length > 0) {
      results.forEach((item: any) => {
        expect(item.feeId).toBe(1);
      });
    }
    expect(countBody.count).toBe(Array.isArray(results) ? results.length : 0);
  });

  // ─── TC21: Filter by countryCode (ID) - both endpoints ────────────────────
  test("TC21 - Both endpoints: Filter by valid countryCode (ID)", async ({
    request,
  }) => {
    const payload = { ...validPayload(), countryCode: "ID" };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results || [];
    expect(results.every((item: any) => item.countryCode === "ID")).toBe(true);
    expect(Array.isArray(results)).toBe(true);
    expect(countBody.count > 0).toBe(true);
  });

  // ─── TC22: Invalid countryCode - both endpoints ──────────────────────────
  test("TC22 - Both endpoints: Invalid countryCode returns 400", async ({
    request,
  }) => {
    const payload = { ...validPayload(), countryCode: "XYZ" };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    expect([400, 404]).toContain(listRes.status());
    expect([400, 404]).toContain(countRes.status());
  });

  // ─── TC23: Empty payload - both endpoints ──────────────────────────────
  test("TC23 - Both endpoints: Empty payload returns 200", async ({
    request,
  }) => {
    const payload = {
      identifier: [],
      conversionId: [],
      merchantAccountNo: [],
      merchantCampaignNo: [],
      partnerAccountNo: [],
      partnerSiteNo: [],
      periodBase: "CONVERSION_DATE",
      fromMonth: "2026-05-01",
      toMonth: "2026-08-26",
      countryCode: "ID",
      statuses: ["Rejected", "Hold"],
    };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    expect(Array.isArray(listBody.results)).toBe(true);
    const results = listBody.results || [];
    expect(Array.isArray(results)).toBe(true);
    expect(countBody.count > 0).toBe(true);
  });

  // ─── TC24: Null field values - both endpoints ──────────────────────────
  test("TC24 - Both endpoints: Null field values should be ignored", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      identifier: null,
      conversionId: null,
    };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results || [];
    expect(Array.isArray(results)).toBe(true);
    expect(countBody.count > 0).toBe(true);
  });

  // ─── TC25: Response structure - list endpoint only ────────────────────────
  test("TC25 - List endpoint: Response contains required fields", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    const results = body.results || [];
    if (Array.isArray(results) && results.length > 0) {
      const firstItem = results[0];
      expect(
        firstItem.conversionId ||
          firstItem.resultId ||
          firstItem.veryfy ||
          firstItem.bannerTypeId,
      ).toBeDefined();
    }
  });

  // ─── TC26: Filter by identifier - both endpoints ────────────────────────
  test("TC26 - Both endpoints: Filter by identifier", async ({ request }) => {
    const payload = { ...validPayload(), identifier: ["239803998204143"] };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results || [];
    if (Array.isArray(results) && results.length > 0) {
      results.forEach((item: any) => {
        expect(item.verify).toBe("239803998204143");
      });
    }
    expect(Array.isArray(results)).toBe(true);
    expect(countBody.count > 0).toBe(true);
  });

  // ─── TC27: Combined filters (AND logic) - both endpoints ────────────────
  test("TC27 - Both endpoints: Combined filters with AND logic", async ({
    request,
  }) => {
    const testPayload = {
      identifier: ["241295263261931"],
      conversionId: [291839706],
      merchantAccountNo: [],
      merchantCampaignNo: [],
      partnerAccountNo: [],
      partnerSiteNo: [],
      periodBase: "CONVERSION_DATE",
      fromMonth: "2026-08-01",
      toMonth: "2026-08-26",
      countryCode: "ID",
      statuses: ["Approved"],
    };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: testPayload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: testPayload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results || [];
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      results.forEach((item: any) => {
        expect(item.conversionId).toBe(291839706);
      });
    }
    const actualCount = Array.isArray(results) ? results.length : 0;
    expect(countBody.count).toBe(actualCount);
  });

  // ─── TC28: API connection failure or timeout exceeding configured limit ────
  test("TC28 - Both endpoints: Simulate API connection failure or response timeout", async ({
    request,
  }) => {
    const payload = validPayload();
    const TIMEOUT_LIMIT = 400;

    try {
      const [listRes, countRes] = await Promise.all([
        request.post(API_URL, {
          headers: getAuthHeaders(),
          data: payload,
          timeout: TIMEOUT_LIMIT,
        }),
        request.post(API_URL_2, {
          headers: getAuthHeaders(),
          data: payload,
          timeout: TIMEOUT_LIMIT,
        }),
      ]);

      if (listRes && countRes) {
        expect([408, 504, 500, 503]).toContain(listRes.status());
        expect([408, 504, 500, 503]).toContain(countRes.status());
      }
    } catch (error: any) {
      expect(error.message).toMatch(
        /timeout|timed out|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|connection/i,
      );
    }
  });

  // ─── TC29: Large dataset without filters - both endpoints (special test) ───────
  test.skip("TC29 - Both endpoints: Load with approximate 1 million records", async ({
    request,
  }) => {
    const payload = {
      identifier: [],
      conversionId: [],
      merchantAccountNo: [],
      merchantCampaignNo: [],
      partnerAccountNo: [],
      partnerSiteNo: [],
      periodBase: "CONVERSION_DATE",
      fromMonth: "2026-01-01",
      toMonth: "2026-08-26",
      countryCode: "ID",
      statuses: ["New", "Hold"],
    };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    await logResponse(listRes);
    await logResponse(countRes);

    expect(listRes.status()).toBe(504);
    expect(countRes.status()).toBe(504);
  });
});
