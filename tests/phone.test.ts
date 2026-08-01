import { describe, expect, it } from "vitest";
import { parsePhone, whatsappLink } from "@/lib/phone";

function ok(result: ReturnType<typeof parsePhone>) {
  if ("error" in result) {
    throw new Error(`expected a valid number, got: ${result.error}`);
  }
  return result;
}

describe("parsePhone", () => {
  it("strips the national trunk prefix for Malaysian mobiles", () => {
    expect(ok(parsePhone("MY", "012-345 6789")).e164).toBe("60123456789");
  });

  it("accepts a number typed without the leading zero", () => {
    expect(ok(parsePhone("MY", "12 345 6789")).e164).toBe("60123456789");
  });

  it("ignores spaces, dashes and brackets", () => {
    expect(ok(parsePhone("MY", "(012) 345-6789")).e164).toBe("60123456789");
  });

  it("lets an explicit + prefix override the selected country", () => {
    // Selected Malaysia, but typed a Hong Kong number.
    expect(ok(parsePhone("MY", "+852 6470 7233")).e164).toBe("85264707233");
  });

  it("formats a readable display value", () => {
    expect(ok(parsePhone("SG", "8123 4567")).display).toBe("+65 8123 4567");
  });

  it.each([
    ["MY", "123", "too short"],
    ["MY", "0123456789012345", "too long"],
    ["SG", "1234 5678", "not a valid Singapore range"],
    ["HK", "441321441331", "far too long for Hong Kong"],
  ])("rejects %s number %s (%s)", (country, input) => {
    expect(parsePhone(country, input)).toHaveProperty("error");
  });

  it("rejects an empty number", () => {
    expect(parsePhone("MY", "")).toHaveProperty("error");
  });

  it("rejects a number with no digits at all", () => {
    expect(parsePhone("MY", "not a phone")).toHaveProperty("error");
  });

  it("rejects an unknown country", () => {
    expect(parsePhone("ZZ", "123456789")).toHaveProperty("error");
  });
});

describe("whatsappLink", () => {
  it("builds a wa.me link from digits only", () => {
    expect(whatsappLink("60123456789")).toBe("https://wa.me/60123456789");
  });

  it("url-encodes a prefilled message", () => {
    expect(whatsappLink("60123456789", "Hi there!")).toBe(
      "https://wa.me/60123456789?text=Hi%20there!",
    );
  });
});
