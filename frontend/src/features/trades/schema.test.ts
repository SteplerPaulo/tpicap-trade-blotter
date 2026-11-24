import { describe, expect, it } from "vitest";
import { z } from "zod";
import { tradeSchema } from "./schema";

const valid = {
  symbol: "AAPL",
  side: "BUY" as const,
  quantity: 100,
  price: 123.45,
  trader: "JSMITH",
  book: "EQUITIES_US",
  counterparty: "Citi",
};

describe("Trade validation", () => {
  describe("Valid trade", () => {
    it("accepts a valid trade", () => {
      expect(tradeSchema.safeParse(valid).success).toBe(true);
    });

    it("accepts a SELL trade", () => {
      expect(tradeSchema.safeParse({ ...valid, side: "SELL" }).success).toBe(
        true,
      );
    });
  });

  describe("Symbol", () => {
    it("normalizes lowercase symbols", () => {
      expect(tradeSchema.parse({ ...valid, symbol: "aapl" }).symbol).toBe(
        "AAPL",
      );
    });

    it("trims surrounding whitespace", () => {
      expect(tradeSchema.parse({ ...valid, symbol: " aapl " }).symbol).toBe(
        "AAPL",
      );
    });

    it.each(["AAPL", "BRK.B", "A".repeat(16)])(
      "accepts valid symbol: %s",
      (symbol) => {
        expect(tradeSchema.safeParse({ ...valid, symbol }).success).toBe(true);
      },
    );

    it.each(["", "   ", "AAPL@", "AA PL", "A".repeat(17)])(
      'rejects invalid symbol: "%s"',
      (symbol) => {
        expect(tradeSchema.safeParse({ ...valid, symbol }).success).toBe(false);
      },
    );
  });

  describe("Side", () => {
    it.each(["HOLD", "", "buy"])('rejects invalid side: "%s"', (side) => {
      expect(tradeSchema.safeParse({ ...valid, side }).success).toBe(false);
    });
  });

  describe("Quantity", () => {
    it.each([1, 100, 1_000_000_000])(
      "accepts valid quantity: %s",
      (quantity) => {
        expect(tradeSchema.safeParse({ ...valid, quantity }).success).toBe(
          true,
        );
      },
    );

    it.each([
      0,
      -1,
      10.5,
      1_000_000_001,
      NaN,
      Infinity,
      "100",
      null,
      undefined,
    ])("rejects invalid quantity: %s", (quantity) => {
      expect(tradeSchema.safeParse({ ...valid, quantity }).success).toBe(false);
    });
  });

  describe("Price", () => {
    it.each([0.0001, 0.01, 123.45, 123.4567, 1_000_000_000])(
      "accepts valid price: %s",
      (price) => {
        expect(tradeSchema.safeParse({ ...valid, price }).success).toBe(true);
      },
    );

    it.each([
      0,
      -1,
      0.00001,
      1.12345,
      1_000_000_001,
      NaN,
      Infinity,
      "123.45",
      null,
      undefined,
    ])("rejects invalid price: %s", (price) => {
      expect(tradeSchema.safeParse({ ...valid, price }).success).toBe(false);
    });
  });

  describe("Trader", () => {
    it.each(["JS", "JSMITH", "J.SMITH", "J_SMITH", "J-SMITH", "A".repeat(64)])(
      "accepts valid trader: %s",
      (trader) => {
        expect(tradeSchema.safeParse({ ...valid, trader }).success).toBe(true);
      },
    );

    it.each(["", "   ", "J", "J SMITH", "J@SMITH", "A".repeat(65)])(
      'rejects invalid trader: "%s"',
      (trader) => {
        expect(tradeSchema.safeParse({ ...valid, trader }).success).toBe(false);
      },
    );
  });

  describe("Book", () => {
    it("accepts maximum length", () => {
      expect(
        tradeSchema.safeParse({
          ...valid,
          book: "A".repeat(64),
        }).success,
      ).toBe(true);
    });

    it.each(["", "   ", "A".repeat(65)])(
      'rejects invalid book: "%s"',
      (book) => {
        expect(tradeSchema.safeParse({ ...valid, book }).success).toBe(false);
      },
    );
  });

  describe("Counterparty", () => {
    it("accepts maximum length", () => {
      expect(
        tradeSchema.safeParse({
          ...valid,
          counterparty: "A".repeat(100),
        }).success,
      ).toBe(true);
    });

    it.each(["", "   ", "A".repeat(101)])(
      'rejects invalid counterparty: "%s"',
      (counterparty) => {
        expect(
          tradeSchema.safeParse({
            ...valid,
            counterparty,
          }).success,
        ).toBe(false);
      },
    );
  });

  describe("Normalization", () => {
    it("trims all supported text fields", () => {
      const result = tradeSchema.parse({
        ...valid,
        symbol: " aapl ",
        trader: " JSMITH ",
        book: " EQUITIES_US ",
        counterparty: " Citi ",
      });

      expect(result).toEqual(valid);
    });
  });

  describe("Required fields", () => {
    it("rejects an empty payload", () => {
      expect(tradeSchema.safeParse({}).success).toBe(false);
    });

    it.each(Object.keys(valid))("rejects missing field: %s", (field) => {
      const input = { ...valid };
      delete input[field as keyof typeof valid];

      expect(tradeSchema.safeParse(input).success).toBe(false);
    });
  });

  describe("Validation errors", () => {
    it("returns errors for multiple invalid fields", () => {
      const result = tradeSchema.safeParse({
        ...valid,
        symbol: "",
        quantity: 0,
        price: -1,
      });

      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = z.flattenError(result.error).fieldErrors;

        expect(errors.symbol).toBeDefined();
        expect(errors.quantity).toBeDefined();
        expect(errors.price).toBeDefined();
      }
    });
  });
});
