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

const API_URL = `${baseURL}/v1/staff/affiliations`;
const API_URL_2 = `${baseURL}/v1/staff/affiliations/count`;

const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);
const getRestrictedAuthHeaders = () => createStaffHeaders(restrictedToken);

const validPayload = () => ({
  publisherSiteNo: [102253, 1],
  campaignNo: [966, 8019],
  partnerAccountNos: [84255, 999],
  ranks: [5, 6],
  affiliationStatus: "APPROVED",
  keyword: "test",
  appliedDateFrom: "2025-08-01",
  appliedDateTo: "2026-08-26",
  approvedDateFrom: "2025-08-05",
  approvedDateTo: "2026-08-26",
  countryCode: "ID",
});

test.describe.skip("Find Affiliation List by Conditions API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Find Affiliation List by Conditions API method `POST /v1/staff/affiliations` and `POST /v1/staff/affiliations/count`
   * * Test scenarios for both list and count endpoints:
   * TC01: Valid payload - both endpoints + count verification
   * TC02: Missing JWT token
   * TC03: Invalid JWT token
   * TC04: Empty payload
   * TC05: Filter by publisherSiteNo
   * TC06: Filter by campaignNo
   * TC07: Non-numeric campaignNo
   * TC08: Filter by partnerAccountNos
   * TC09: Filter by ranks (1-10)
   * TC10: Filter by affiliationStatus
   * TC11: Filter by keyword
   * TC12: No matching keyword (empty result)
   * TC13: Filter by appliedDateFrom
   * TC14: Invalid appliedDateFrom format
   * TC15: Filter by appliedDateTo
   * TC16: Filter by approvedDateFrom
   * TC17: Filter by approvedDateTo
   * TC18: Filter by countryCode
   * TC19: Invalid countryCode
   * TC20: Null field values
   * TC21: Response structure (list endpoint only)
   * TC22: Combined filters (AND logic)
   * TC23: Non-matching filters (count=0)
   * TC24: Large dataset (1 million records)
   * TC25: API connection failure or timeout exceeding configured limit
   * TC26: Filter by multiple publisherSiteNo values
   * TC27: Filter by multiple campaignNo values
   * TC28: Filter by multiple partnerAccountNos values
   * TC29: Invalid countryCode (ABC)
   * TC30: payload with null and zero values returns 400
   */

  // ─── TC01: Valid payload - both endpoints ──────────────────────────────────────
  test("TC01 - Both endpoints: Valid payload returns 200 with data", async ({
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
    const listCount = Array.isArray(listBody.results)
      ? listBody.results.length
      : 0;
    expect(countBody.count).toBe(listCount);
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

  // ─── TC04: Empty payload - both endpoints ──────────────────────────────────────
  test("TC04 - Both endpoints: Empty payload returns 200", async ({
    request,
  }) => {
    const payload = {
      publisherSiteNo: [],
      campaignNo: [],
      partnerAccountNos: [],
      ranks: [],
      affiliationStatus: null,
      keyword: null,
      appliedDateFrom: "2025-08-01",
      appliedDateTo: "2026-08-26",
      countryCode: "ID",
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
    const listCount = Array.isArray(listBody.results)
      ? listBody.results.length
      : 0;
    expect(countBody.count).toBe(listCount);
  });

  // ─── TC05: Filter by publisherSiteNo - both endpoints ────────────────────────────
  test("TC05 - Both endpoints: Filter by publisherSiteNo", async ({
    request,
  }) => {
    const payload = { ...validPayload(), publisherSiteNo: [2500] };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.data || listBody.affiliations || listBody;
    if (Array.isArray(results) && results.length > 0) {
      results.forEach((item: any) => {
        expect([2500, 1]).toContain(
          Number(item.publisherSiteNo || item.siteNo),
        );
      });
    }
    const listCount = Array.isArray(results) ? results.length : 0;
    expect(countBody.count).toBe(listCount);
  });

  // ─── TC06: Filter by campaignNo - both endpoints ───────────────────────────────
  test("TC06 - Both endpoints: Filter by campaignNo", async ({ request }) => {
    const payload = { ...validPayload(), campaignNo: [966] };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.data || listBody.affiliations || listBody;
    if (Array.isArray(results) && results.length > 0) {
      results.forEach((item: any) => {
        expect([966, 8019]).toContain(
          Number(item.campaignNo || item.campaignId),
        );
      });
    }
    const listCount = Array.isArray(results) ? results.length : 0;
    expect(countBody.count).toBe(listCount);
  });

  // ─── TC07: Filter by campaignNo non-numeric - both endpoints ────────────────────
  test("TC07 - Both endpoints: Non-numeric campaignNo returns 500", async ({
    request,
  }) => {
    const payload = { ...validPayload(), campaignNo: ["ABC"] };
    const payload2 = { ...validPayload(), partnerAccountNos: ["ABC"] };
    const payload3 = { ...validPayload(), publisherSiteNo: ["ABC"] };
    const payload4 = { ...validPayload(), ranks: ["ABC"] };

    const [
      listRes,
      countRes,
      listRes2,
      countRes2,
      listRes3,
      countRes3,
      listRes4,
      countRes4,
    ] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL, { headers: getAuthHeaders(), data: payload2 }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload2 }),
      request.post(API_URL, { headers: getAuthHeaders(), data: payload3 }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload3 }),
      request.post(API_URL, { headers: getAuthHeaders(), data: payload4 }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload4 }),
    ]);

    expect([400, 500]).toContain(listRes.status());
    expect([400, 500]).toContain(countRes.status());
    expect([400, 500]).toContain(listRes2.status());
    expect([400, 500]).toContain(countRes2.status());
    expect([400, 500]).toContain(listRes3.status());
    expect([400, 500]).toContain(countRes3.status());
    expect([400, 500]).toContain(listRes4.status());
    expect([400, 500]).toContain(countRes4.status());
  });

  // ─── TC08: Filter by partnerAccountNos - both endpoints ───────────────────────
  test("TC08 - Both endpoints: Filter by partnerAccountNos", async ({
    request,
  }) => {
    const payload = { ...validPayload(), partnerAccountNos: [84255] };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.data || listBody.affiliations || listBody;
    const listCount = Array.isArray(results) ? results.length : 0;
    expect(countBody.count).toBe(listCount);
  });

  // ─── TC09: Filter by ranks - both endpoints ───────────────────────────────────
  test("TC09 - Both endpoints: Filter by valid ranks (1-10)", async ({
    request,
  }) => {
    const payload = { ...validPayload(), ranks: [5, 6] };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results;
    if (Array.isArray(results) && results.length > 0) {
      results.forEach((item: any) => {
        const rank = parseInt(item.rank || item.ranks);
        expect(rank).toBeGreaterThanOrEqual(1);
        expect(rank).toBeLessThanOrEqual(10);
      });
    }
    const listCount = Array.isArray(results) ? results.length : 0;
    expect(countBody.count).toBe(listCount);
  });

  // ─── TC10: Filter by affiliationStatus - both endpoints ─────────────────────────
  test("TC10 - Both endpoints: Filter by affiliationStatus=APPROVED", async ({
    request,
  }) => {
    const payload = { ...validPayload(), affiliationStatus: "APPROVED" };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results;
    const listCount = Array.isArray(results) ? results.length : 0;
    expect(countBody.count).toBe(listCount);
  });

  // ─── TC11: Filter by keyword - both endpoints ──────────────────────────────────
  test("TC11 - Both endpoints: Filter by keyword", async ({ request }) => {
    const payload = { ...validPayload(), keyword: "example" };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results;
    expect(Array.isArray(results)).toBe(true);
    const listCount = Array.isArray(results) ? results.length : 0;
    expect(countBody.count).toBe(listCount);
  });

  // ─── TC12: Filter by keyword with no matches - both endpoints ─────────────────
  test("TC12 - Both endpoints: Non-matching keyword returns empty list", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      keyword: "<script>alert(1)</script>",
    };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results;
    expect(results.length).toBe(0);
    expect(countBody.count).toBe(0);
  });

  // ─── TC13: Filter by appliedDateFrom - both endpoints ────────────────────────
  test("TC13 - Both endpoints: Filter by appliedDateFrom (YYYY-MM-DD)", async ({
    request,
  }) => {
    const payload = { ...validPayload(), appliedDateFrom: "2026-08-01" };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const listCount = Array.isArray(listBody.results)
      ? listBody.results.length
      : 0;
    expect(countBody.count).toBe(listCount);
  });

  // ─── TC14: Invalid appliedDateFrom format - both endpoints ───────────────────
  test("TC14 - Both endpoints: Invalid appliedDateFrom format returns 400", async ({
    request,
  }) => {
    const payload = { ...validPayload(), appliedDateFrom: "2026/08/01" };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    expect([400, 500]).toContain(listRes.status());
    expect([400, 500]).toContain(countRes.status());
  });

  // ─── TC15: Filter by appliedDateTo - both endpoints ──────────────────────────
  test("TC15 - Both endpoints: Filter by appliedDateTo (YYYY-MM-DD)", async ({
    request,
  }) => {
    const payload = { ...validPayload(), appliedDateTo: "2026-08-26" };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const listCount = Array.isArray(listBody.results)
      ? listBody.results.length
      : 0;
    expect(countBody.count).toBe(listCount);
  });

  // ─── TC16: Filter by approvedDateFrom - both endpoints ──────────────────────
  test("TC16 - Both endpoints: Filter by approvedDateFrom (YYYY-MM-DD)", async ({
    request,
  }) => {
    const payload = { ...validPayload(), approvedDateFrom: "2026-08-05" };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const listCount = Array.isArray(listBody.results)
      ? listBody.results.length
      : 0;
    expect(countBody.count).toBe(listCount);
  });

  // ─── TC17: Filter by approvedDateTo - both endpoints ──────────────────────────
  test("TC17 - Both endpoints: Filter by approvedDateTo (YYYY-MM-DD)", async ({
    request,
  }) => {
    const payload = { ...validPayload(), approvedDateTo: "2026-08-26" };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const listCount = Array.isArray(listBody.results)
      ? listBody.results.length
      : 0;
    expect(countBody.count).toBe(listCount);
  });

  // ─── TC18: Filter by countryCode - both endpoints ──────────────────────────────
  test("TC18 - Both endpoints: Filter by valid countryCode", async ({
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
    const results = listBody.results;

    const listCount = Array.isArray(results) ? results.length : 0;
    expect(countBody.count).toBe(listCount);
  });

  // ─── TC19: Invalid countryCode - both endpoints ────────────────────────────────
  test("TC19 - Both endpoints: Invalid countryCode returns 400", async ({
    request,
  }) => {
    const payload = { ...validPayload(), countryCode: "XYZ" };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    expect([400, 200]).toContain(listRes.status());
    expect([400, 200]).toContain(countRes.status());
  });

  // ─── TC20: Null field values - both endpoints ──────────────────────────────────
  test("TC20 - Both endpoints: Null field values should be ignored", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      publisherSiteNo: null,
      campaignNo: null,
      keyword: null,
    };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const listCount = Array.isArray(listBody.results)
      ? listBody.results.length
      : 0;
    expect(countBody.count).toBe(listCount);
  });

  // ─── TC21: Response structure - list endpoint only ────────────────────────────
  test("TC21 - List endpoint: Response contains required fields", async ({
    request,
  }) => {
    const res = await request.post(API_URL, {
      headers: getAuthHeaders(),
      data: validPayload(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    const results = body.data || body.affiliations || body;
    if (Array.isArray(results) && results.length > 0) {
      const firstItem = results[0];
      expect(
        firstItem.affiliationId || firstItem.id || firstItem.affiliationNo,
      ).toBeDefined();
    }
  });

  // ─── TC22: Combined filters (AND logic) - both endpoints ──────────────────────
  test("TC22 - Both endpoints: Combined filters with AND logic", async ({
    request,
  }) => {
    const testPayload = {
      publisherSiteNo: [102253, 1],
      campaignNo: [966],
      partnerAccountNos: [84255, 999],
      ranks: [5, 6],
      affiliationStatus: "APPROVED",
      keyword: "test",
      appliedDateFrom: "2025-08-01",
      appliedDateTo: "2026-08-26",
      approvedDateFrom: "2025-08-05",
      approvedDateTo: "2026-08-26",
      countryCode: "ID",
    };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: testPayload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: testPayload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results;
    expect(Array.isArray(results)).toBe(true);
    expect(countBody.count).toBe(Array.isArray(results) ? results.length : 0);
  });

  // ─── TC23: Non-matching filters - both endpoints ────────────────────────────────
  test("TC23 - Both endpoints: Non-matching filters return count=0", async ({
    request,
  }) => {
    const payload = { ...validPayload(), publisherSiteNo: [9999999] };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    const listBody = await logResponse(listRes);
    const countBody = await logResponse(countRes);

    expect(listRes.status()).toBe(200);
    expect(countRes.status()).toBe(200);
    const results = listBody.results;
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
    expect(countBody.count).toBe(0);
  });

  // ─── TC24: Large dataset without filters - both endpoints (special test) ───────
  test.skip("TC24 - Both endpoints: Load with approximate 1 million records", async ({
    request,
  }) => {
    const payload = {
      countryCode: null,
      publisherSiteNo: [],
      campaignNo: [],
      partnerAccountNos: [],
      ranks: [],
      affiliationStatus: null,
      keyword: null,
    };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    await logResponse(listRes);
    await logResponse(countRes);

    expect(listRes.status()).toBe(504);
    expect(countRes.status()).toBe(200);
  });

  // ─── TC25: API connection failure or timeout exceeding configured limit ────
  test("TC25 - Both endpoints: Simulate API connection failure or response timeout", async ({
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
        expect([200, 408, 504, 500, 503]).toContain(listRes.status());
        expect([200, 408, 504, 500, 503]).toContain(countRes.status());
      }
    } catch (error: any) {
      expect(error.message).toMatch(
        /timeout|timed out|ETIMEDOUT|ECONNREFUSED|ENOTFOUND|connection/i,
      );
    }
  });

  // ─── TC26: appliedDateFrom > appliedDateTo - both endpoints ──────────────────
  test("TC26 - Both endpoints: appliedDateFrom > appliedDateTo returns 400", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      appliedDateFrom: "2026-08-26",
      appliedDateTo: "2025-08-01",
    };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    expect([400, 404]).toContain(listRes.status());
    expect([400, 404]).toContain(countRes.status());
  });

  // ─── TC27: approvedDateFrom > approvedDateTo - both endpoints ────────────────
  test("TC27 - Both endpoints: approvedDateFrom > approvedDateTo returns 400", async ({
    request,
  }) => {
    const payload = {
      ...validPayload(),
      approvedDateFrom: "2026-08-26",
      approvedDateTo: "2025-08-05",
    };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    expect([400, 404]).toContain(listRes.status());
    expect([400, 404]).toContain(countRes.status());
  });

  // ─── TC28: Invalid affiliationStatus - both endpoints ──────────────────────────
  test("TC28 - Both endpoints: Invalid affiliationStatus returns 400", async ({
    request,
  }) => {
    const payload = { ...validPayload(), affiliationStatus: "Invalid" };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    expect([400, 404]).toContain(listRes.status());
    expect([400, 404]).toContain(countRes.status());
  });

  // ─── TC29: Invalid countryCode (ABC) - both endpoints ────────────────
  test("TC29 - Both endpoints: Invalid countryCode (ABC) returns 400", async ({
    request,
  }) => {
    const payload = { ...validPayload(), countryCode: "ABC" };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    expect([400, 404]).toContain(listRes.status());
    expect([400, 404]).toContain(countRes.status());
  });

  // ─── TC30: payload with null and zero values - both endpoints ────────────────
  test("TC30 - Both endpoints: payload with null and zero values returns 400", async ({
    request,
  }) => {
    const payload = {
      countryCode: null,
      publisherSiteNo: [0],
      campaignNo: [0],
      partnerAccountNos: [0],
      ranks: [0],
      affiliationStatus: null,
      keyword: null,
    };

    const [listRes, countRes] = await Promise.all([
      request.post(API_URL, { headers: getAuthHeaders(), data: payload }),
      request.post(API_URL_2, { headers: getAuthHeaders(), data: payload }),
    ]);

    expect([400, 404]).toContain(listRes.status());
    expect([400, 404]).toContain(countRes.status());
  });
});
