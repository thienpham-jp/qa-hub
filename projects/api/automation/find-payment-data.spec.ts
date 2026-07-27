import { test, expect } from "@playwright/test";
import { urlStagingAPI } from "@shared/utils/base-url-helper";
import { generateJWT } from "@shared/utils/jwt-helper";
import { SECRET_KEY, USER_UID } from "@shared/utils/user-helper";
import {
  logResponse,
  createStaffHeaders,
  RESTRICTED_USER_UID,
  RESTRICTED_SECRET_KEY,
} from "./helpers/api-test-helper";

const baseURL = urlStagingAPI("ID");

const API_URL = `${baseURL}/v1/staff/payment`;

const token = `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;
const restrictedToken = `Bearer ${generateJWT(RESTRICTED_USER_UID, RESTRICTED_SECRET_KEY)}`;

const getAuthHeaders = () => createStaffHeaders(token);

// TODO: replace with a invoiceId that has rank master data in staging DB
const VALID_INVOICE_ID = "ATID202510-1";
const NON_EXISTING_INVOICE_ID = 999999999;

const buildUrl = (params: Record<string, string | number | boolean>) => {
  const query = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  return `${API_URL}?${query}`;
};

test.describe("Find Payment Data API", () => {
  test.describe.configure({ mode: "parallel" });

  /** Test Cases for Find Payment Data API method `GET v1/staff/payment`
   * Test summary to cover:
   * 1. Authentication failure with invalid token
   * 2. Authorization failure for restricted user
   * 3. Missing user type: Expect 400 message "invalid user type: "
   * 4. Input param missing invoiceId - Expect 404 Not Found with appropriate error message
   * 5. Input param invoiceId does not exist - Expect 404 Not Found with appropriate error message
   * 6. Input param valid invoiceId - Expect 200 OK with data
   */

  // ─── TC_01 ──────────────────────────────────────────────────────────────────
  test("TC_01 - Authentication failure (no token) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    const res = await request.get(buildUrl({ invoiceId: VALID_INVOICE_ID }), {
      headers: {
        "Content-Type": "application/json",
        "X-Accesstrade-User-Type": "staff",
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_02 ──────────────────────────────────────────────────────────────────
  test("TC_02 - Authorization failure (restricted user) - Expect 401 Unauthorized", async ({
    request,
  }) => {
    // TODO: replace RESTRICTED_USER_UID / RESTRICTED_SECRET_KEY with an actual
    // staff account that has no permission in staging DB
    const res = await request.get(buildUrl({ invoiceId: VALID_INVOICE_ID }), {
      headers: { ...getAuthHeaders(), Authorization: restrictedToken },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(401);
    expect(JSON.stringify(body)).toMatch(/JWT auth failed!/i);
  });

  // ─── TC_03 ──────────────────────────────────────────────────────────────────
  test("TC_03 - Missing user type - Expect 400 Bad Request", async ({
    request,
  }) => {
    const res = await request.get(buildUrl({ invoiceId: VALID_INVOICE_ID }), {
      headers: {
        "Content-Type": "application/json",
      },
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(400);
    expect(JSON.stringify(body)).toMatch(/invalid user type:/i);
  });

  // ─── TC_04 ──────────────────────────────────────────────────────────────────
  test("TC_04 - Missing invoiceId param - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.get(buildUrl({}), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not existing|invoice ID/i);
  });

  // ─── TC_05 ──────────────────────────────────────────────────────────────────
  test("TC_05 - Non-existing invoiceId - Expect 404 Not Found", async ({
    request,
  }) => {
    const res = await request.get(
      buildUrl({ invoiceId: NON_EXISTING_INVOICE_ID }),
      { headers: getAuthHeaders() },
    );
    const body = await logResponse(res);
    expect(res.status()).toBe(404);
    expect(JSON.stringify(body)).toMatch(/Not existing|invoice ID/i);
  });

  // ─── TC_06 ──────────────────────────────────────────────────────────────────
  test("TC_06 - Valid invoiceId - Expect 200 OK with data", async ({
    request,
  }) => {
    // TODO: use a invoiceId that exists but has no rank master with useFlag=0 in staging DB
    const res = await request.get(buildUrl({ invoiceId: VALID_INVOICE_ID }), {
      headers: getAuthHeaders(),
    });
    const body = await logResponse(res);
    expect(res.status()).toBe(200);
    expect(body).toHaveProperty("totalAmount");
    expect(body).toHaveProperty("paymentDetails");
  });
});
