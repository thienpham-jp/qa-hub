import {
  randomInt as cryptoRandomInt,
  randomUUID as cryptoRandomUUID,
} from "crypto";

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Chọn ngẫu nhiên 1 index trong [0, max) bằng crypto */
function secureIndex(max: number): number {
  return cryptoRandomInt(0, max);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function random_secure_password(
  length: number = 12,
  include_confirmation: boolean = false,
): string | [string, string] {
  const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
  const numberChars = "0123456789";
  const specialChars = "!@#$%^&*:;?><,./=";
  const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
  let password = "";
  for (let i = 0; i < length; i++) {
    password += allChars.charAt(secureIndex(allChars.length));
  }
  if (include_confirmation) {
    return [password, password];
  }
  return password;
}

export function randomString(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(secureIndex(chars.length));
  }
  return result;
}

export function randomSentence(wordCount: number = 5): string {
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    words.push(randomString(randomInt(3, 10)));
  }
  return words.join(" ");
}

/** Số nguyên ngẫu nhiên trong [min, max] (inclusive) */
export function randomInt(min: number, max: number): number {
  return cryptoRandomInt(min, max + 1);
}

/** Số thực ngẫu nhiên trong [min, max] với số chữ số thập phân tùy chỉnh */
export function randomFloat(
  min: number,
  max: number,
  decimals: number = 2,
): number {
  // Dùng hai số nguyên ngẫu nhiên để tạo float có phân phối đồng đều
  const scale = 10 ** decimals;
  const scaledMin = Math.ceil(min * scale);
  const scaledMax = Math.floor(max * scale);
  return cryptoRandomInt(scaledMin, scaledMax + 1) / scale;
}

export function randomBoolean(): boolean {
  return cryptoRandomInt(0, 2) === 1;
}

export function randomEmail(domain: string = "yopmail.com"): string {
  const localPart = randomString(8).toLowerCase();
  return `${localPart}@${domain}`;
}

export function randomUserEmail(
  user: string = randomString(8).toLowerCase(),
): string {
  const domain =
    "yahoo" + "." + randomArrayElement(["com", "net", "org", "io", "dev"]);
  return `${user}@${domain}`;
}

export function randomPhoneNumber(countryCode: string = "+84"): string {
  const digits = Array.from({ length: 9 }, () => cryptoRandomInt(0, 10)).join(
    "",
  );
  return `${countryCode}${digits}`;
}

export function randomDate(
  start: Date = new Date(1960, 0, 1),
  end: Date = new Date(),
): Date {
  const startMs = start.getTime();
  const endMs = end.getTime();
  if (startMs > endMs) {
    throw new RangeError(
      `randomDate: start (${start.toISOString()}) must be before or equal to end (${end.toISOString()})`,
    );
  }
  if (startMs === endMs) return new Date(startMs);
  return new Date(cryptoRandomInt(startMs, endMs + 1));
}

export function randomDateString(
  start: Date = new Date(1960, 0, 1),
  end: Date = new Date(),
  format: "ISO" | "locale" = "ISO",
): string {
  const date = randomDate(start, end);
  return format === "ISO"
    ? date.toISOString().split("T")[0]
    : date.toLocaleDateString();
}

export function randomArrayElement<T>(arr: T[]): T {
  return arr[secureIndex(arr.length)];
}

/** Fisher-Yates shuffle — phân phối đồng đều, không bị bias như .sort() */
export function randomSample<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = cryptoRandomInt(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, arr.length));
}

export function randomFullName(): string {
  const firstNames = [
    "An",
    "Bình",
    "Cường",
    "Dung",
    "Hoa",
    "Hùng",
    "Lan",
    "Minh",
    "Nam",
    "Phương",
    "Quang",
    "Thảo",
    "Tuấn",
    "Vy",
    "Xuân",
  ];
  const lastNames = [
    "Nguyễn",
    "Trần",
    "Lê",
    "Phạm",
    "Hoàng",
    "Huỳnh",
    "Phan",
    "Vũ",
    "Đặng",
    "Bùi",
    "Đỗ",
    "Hồ",
    "Ngô",
    "Dương",
    "Lý",
  ];
  return `${randomArrayElement(lastNames)} ${randomArrayElement(firstNames)}`;
}

export function randomAddress(): string {
  const streets = [
    "Lý Thường Kiệt",
    "Nguyễn Huệ",
    "Trần Hưng Đạo",
    "Lê Lợi",
    "Đinh Tiên Hoàng",
    "Hai Bà Trưng",
    "Nguyễn Trãi",
  ];
  const districts = [
    "Quận 1",
    "Quận 3",
    "Quận 5",
    "Quận 7",
    "Bình Thạnh",
    "Tân Bình",
    "Gò Vấp",
  ];
  const houseNo = randomInt(1, 500);
  return `${houseNo} ${randomArrayElement(streets)}, ${randomArrayElement(districts)}, TP.HCM`;
}

/** Dùng crypto.randomUUID() built-in — chuẩn RFC 4122 */
export function randomUUID(): string {
  return cryptoRandomUUID();
}

export function randomURL(): string {
  const domain =
    randomString(10).toLowerCase() +
    "." +
    randomArrayElement(["com", "net", "org", "io", "dev"]);

  return `https://${domain}`;
}

/** Tạo chuỗi base64 ảnh ngẫu nhiên theo format: "<mimeType>,<base64>"
 *  Tương đương Java: mimeType + "," + Base64.getEncoder().encodeToString(bytes)
 */
export function randomImageBase64(
  mimeType: string = "image/png",
  sizeBytes: number = 64,
): string {
  const bytes = new Uint8Array(sizeBytes);
  for (let i = 0; i < sizeBytes; i++) {
    bytes[i] = cryptoRandomInt(0, 256);
  }
  return `${mimeType},${Buffer.from(bytes).toString("base64")}`;
}

export function randomCapcha(): string {
  const letters = "abcdef";
  const digits = "123456789";
  const L = () => letters.charAt(cryptoRandomInt(0, letters.length));
  const D = () => digits.charAt(cryptoRandomInt(0, digits.length));

  // pattern: chữ-số-chữ-số-số-số-chữ  (e.g. "e3f747b")
  return [L(), D(), L(), D(), D(), D(), L()].join("");
}
