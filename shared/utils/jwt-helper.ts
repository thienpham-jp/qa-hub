import { createHmac } from "crypto";

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generateJWT(userUid: string, secretKey: string): string {
  const currentTime = Math.floor(Date.now() / 1000);

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const payload = {
    sub: userUid,
    iat: currentTime,
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));

  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  const signatureEncoded = createHmac("sha256", secretKey)
    .update(signatureInput)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${headerEncoded}.${payloadEncoded}.${signatureEncoded}`;
}
