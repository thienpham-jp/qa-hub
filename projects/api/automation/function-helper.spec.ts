import { test, expect } from "@playwright/test";
import {
  random_secure_password,
  randomString,
  randomInt,
  randomFloat,
  randomBoolean,
  randomEmail,
  randomPhoneNumber,
  randomDate,
  randomDateString,
  randomArrayElement,
  randomSample,
  randomFullName,
  randomAddress,
  randomUUID,
  randomCapcha,
  randomSentence,
  randomUserEmail,
  randomURL,
  randomImageBase64,
} from "@shared/utils/function-helper";

test.describe("function-helper", () => {
  test.describe("random_secure_password", () => {
    test("Return string with default length 12", () => {
      const pwd = random_secure_password() as string;

      expect(typeof pwd).toBe("string");
      expect(pwd.length).toBe(12);
    });

    test("Return string with custom length", () => {
      const pwd = random_secure_password(20) as string;

      expect(pwd.length).toBe(20);
    });

    test("Return tuple [password, password] when include_confirmation = true", () => {
      const result = random_secure_password(12, true) as [string, string];

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toBe(result[1]);
    });
  });

  test.describe("randomString", () => {
    test("Return string with correct length", () => {
      const s10 = randomString(10);
      const s1 = randomString(1);
      const s50 = randomString(50);

      expect(s10.length).toBe(10);
      expect(s1.length).toBe(1);
      expect(s50.length).toBe(50);
    });

    test("Only contains alphanumeric characters", () => {
      const result = randomString(100);
      expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  test.describe("randomSentence", () => {
    test("Return string with default number of words", () => {
      const sentence = randomSentence();
      const words = sentence.split(" ");
      expect(words.length).toBe(5);
    });

    test("Return string with correct number of words", () => {
      const sentence = randomSentence(7);
      const words = sentence.split(" ");
      expect(words.length).toBe(7);
    });
  });

  test.describe("randomInt", () => {
    test("Return integer within range [min, max]", () => {
      const samples: number[] = [];
      for (let i = 0; i < 50; i++) {
        const val = randomInt(1, 10);
        samples.push(val);
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(10);
        expect(Number.isInteger(val)).toBe(true);
      }
    });

    test("Works correctly when min = max", () => {
      const val = randomInt(5, 5);

      expect(val).toBe(5);
    });
  });

  test.describe("randomFloat", () => {
    test("Return float within range [min, max]", () => {
      const samples: number[] = [];
      for (let i = 0; i < 50; i++) {
        const val = randomFloat(0, 100);
        samples.push(val);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(100);
      }
    });

    test("Return float with correct number of decimal places", () => {
      const val = randomFloat(0, 10, 3);

      const decimalPart = val.toString().split(".")[1] ?? "";
      expect(decimalPart.length).toBeLessThanOrEqual(3);
    });
  });

  test.describe("randomBoolean", () => {
    test("Return true or false only", () => {
      const samples: boolean[] = [];
      for (let i = 0; i < 20; i++) {
        const val = randomBoolean();
        samples.push(val);
        expect(typeof val).toBe("boolean");
      }
    });
  });

  test.describe("randomEmail", () => {
    test("Return valid email with default domain", () => {
      const email = randomEmail();

      expect(email).toMatch(/^[a-z0-9]+@yopmail\.com$/);
    });

    test("Return email with custom domain", () => {
      const email = randomEmail("test.vn");

      expect(email).toMatch(/^[a-z0-9]+@test\.vn$/);
    });
  });

  test.describe("randomUserEmail", () => {
    test("Return valid email with default username input", () => {
      const email = randomUserEmail("test1234");

      expect(email).toMatch(/^test1234+@yahoo\.(com|net|org|io|dev)$/);
    });

    test("Return email with custom username", () => {
      const email = randomUserEmail();

      expect(email).toMatch(/^[a-z0-9]+@[a-z0-9]+\.(com|net|org|io|dev)$/);
    });
  });

  test.describe("randomPhoneNumber", () => {
    test("Return phone number with default country code +84", () => {
      const phone = randomPhoneNumber();

      expect(phone).toMatch(/^\+84\d{9}$/);
    });

    test("Return phone number with custom country code", () => {
      const phone = randomPhoneNumber("+1");

      expect(phone).toMatch(/^\+1\d{9}$/);
    });
  });

  test.describe("randomDate", () => {
    test("Return Date object", () => {
      const d = randomDate();

      expect(d).toBeInstanceOf(Date);
    });

    test("Return date within range [start, end]", () => {
      const start = new Date(2020, 0, 1);
      const end = new Date(2023, 11, 31);
      const samples: string[] = [];
      for (let i = 0; i < 20; i++) {
        const d = randomDate(start, end);
        samples.push(d.toISOString().split("T")[0]);
        expect(d.getTime()).toBeGreaterThanOrEqual(start.getTime());
        expect(d.getTime()).toBeLessThanOrEqual(end.getTime());
      }
    });
  });

  test.describe("randomDateString", () => {
    test("Return string in ISO format YYYY-MM-DD", () => {
      const dateStr = randomDateString(undefined, undefined, "ISO");

      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test("Return string in locale format", () => {
      const dateStr = randomDateString(undefined, undefined, "locale");

      expect(typeof dateStr).toBe("string");
      expect(dateStr.length).toBeGreaterThan(0);
    });
  });

  test.describe("randomPickFrom", () => {
    test("Return element from input array", () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      for (let i = 0; i < 10; i++) {
        expect(arr).toContain(randomArrayElement(arr));
      }
    });

    test("Works with string array", () => {
      const arr = ["a", "b", "c"];
      const picked = randomArrayElement(arr);

      expect(arr).toContain(picked);
    });
  });

  test.describe("randomSample", () => {
    test("Return correct number of elements", () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const sample = randomSample(arr, 4);

      expect(sample.length).toBe(4);
    });

    test("Return unique elements only", () => {
      const arr = [1, 2, 3, 4, 5];
      const sample = randomSample(arr, 5);

      const unique = new Set(sample);
      expect(unique.size).toBe(sample.length);
    });

    test("All elements belong to the original array", () => {
      const arr = ["x", "y", "z"];
      const sample = randomSample(arr, 2);

      sample.forEach((item) => {
        expect(arr).toContain(item);
      });
    });

    test("Return entire array if count is greater than array length", () => {
      const arr = [1, 2, 3];
      const sample = randomSample(arr, 100);

      expect(sample.length).toBe(3);
    });
  });

  test.describe("randomFullName", () => {
    test("Return string with at least 2 words", () => {
      const names: string[] = [];
      for (let i = 0; i < 10; i++) {
        const name = randomFullName();
        names.push(name);
        expect(name.trim().split(" ").length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  test.describe("randomAddress", () => {
    test("Return address containing TP.HCM", () => {
      const address = randomAddress();

      expect(address).toContain("TP.HCM");
    });

    test("Return non-empty string", () => {
      const address = randomAddress();

      expect(address.length).toBeGreaterThan(0);
    });
  });

  test.describe("randomUUID", () => {
    test("Return UUID in correct v4 format", () => {
      const uuid = randomUUID();

      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    test("Return different UUIDs on each call", () => {
      const uuids = Array.from({ length: 20 }, () => randomUUID());

      expect(new Set(uuids).size).toBe(20);
    });
  });

  test.describe("randomURL", () => {
    test("Return URL in correct format", () => {
      const url = randomURL();
      expect(url).toMatch(/^https?:\/\/[a-z0-9]+(\.[a-z0-9]+)+\/?$/);
    });

    test("Return different URLs on each call", () => {
      const urls = Array.from({ length: 20 }, () => randomURL());
      expect(new Set(urls).size).toBe(20);
    });
  });

  test.describe("randomImageBase64", () => {
    test("Return string in correct Base64 format with data URI prefix", () => {
      const base64 = randomImageBase64();
      expect(base64).toMatch(/^image\/\w+,[A-Za-z0-9+/=]+$/);
    });

    test("Return Base64 string of approximately correct size", () => {
      const sizeBytes = 128;
      const base64 = randomImageBase64("image/png", sizeBytes);
      const base64Data = base64.split(",")[1];
      const decodedSize = (base64Data.length * 3) / 4;
      expect(decodedSize).toBeGreaterThanOrEqual(sizeBytes * 0.9);
      expect(decodedSize).toBeLessThanOrEqual(sizeBytes * 1.1);
    });
  });

  test.describe("randomCapcha", () => {
    test("Return string of correct length", () => {
      const capcha = randomCapcha();

      console.log("Generated capcha:", capcha);

      expect(capcha.length).toBe(7);
    });
  });
});
