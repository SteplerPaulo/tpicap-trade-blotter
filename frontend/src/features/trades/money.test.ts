import { describe, expect, it } from "vitest";
import {
  formatPrice,
  formatNotional,
  notionalUnits,
  priceUnits,
} from "./money";

describe("fixed-point trade money", () => {
  it.each([
    [3, 0.1, "0.30"],
    [1, 0.0001, "0.0001"],
    [3, 123.4567, "370.3701"],
    [100, 185.25, "18,525.00"],
    [1_000_000_000, 1_000_000_000, "1,000,000,000,000,000,000.00"],
    [1_000_000_000, 999999999.9999, "999,999,999,999,900,000.00"],
  ] as const)("formats %s × %s exactly", (quantity, price, expected) => {
    expect(formatNotional(quantity, price)).toBe(expected);
  });
  it("preserves four decimal places", () =>
    expect(formatPrice(123.4567)).toBe("123.4567"));
  it("preserves exact units", () => expect(notionalUnits(3, 0.1)).toBe(3000n));
  it.each([NaN, Infinity, 0, -1, 0.00001, 1.23456, 1_000_000_001])(
    "rejects invalid price %s",
    (price) => expect(() => priceUnits(price)).toThrow(RangeError),
  );
  it.each([0, -1, 1.5, NaN, 1_000_000_001])(
    "rejects invalid quantity %s",
    (quantity) => expect(() => notionalUnits(quantity, 1)).toThrow(RangeError),
  );
});
