import { APIResponse } from "@playwright/test";
import { generateJWT } from "@shared/utils/jwt-helper";
import { USER_UID, SECRET_KEY } from "@shared/utils/user-helper";

// Placeholder credentials for restricted-access test cases
export const RESTRICTED_USER_UID = "restricted_user_uid_placeholder";
export const RESTRICTED_SECRET_KEY = "restricted_secret_key_placeholder";

/**
 * Returns standard staff request headers for the given bearer token.
 */
export const createStaffHeaders = (token: string): Record<string, string> => ({
  "Content-Type": "application/json",
  "X-Accesstrade-User-Type": "staff",
  Authorization: token,
});

/**
 * Returns a fresh Bearer token for the default staff user.
 */
export const getStaffToken = (): string =>
  `Bearer ${generateJWT(USER_UID, SECRET_KEY)}`;

/**
 * Parses and logs the API response body. Falls back to raw text if JSON
 * parsing fails. Safe to call on any APIResponse regardless of content type.
 */
export async function logResponse(
  res: APIResponse,
  logResults: boolean = true,
): Promise<any> {
  let responseBody: any = null;
  try {
    const rawBody = await res.text();
    responseBody =
      rawBody && typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    if (responseBody !== "") {
      if (logResults) {
        console.log(JSON.stringify(responseBody, null, 2));
      }
    }
  } catch (error) {
    console.error("Failed to parse response body as JSON:", error);
    responseBody = await res.text();
  }
  return responseBody;
}
