import { describe, expect, it } from "vitest";
import { buildTradesCsv, escapeCsvText } from "./csv";
import type { Trade } from "./types";

const trade: Trade = {
  id: "id",
  tradeId: "TRD-1",
  tradeDate: "2026-11-24T00:00:00.000Z",
  symbol: "AAPL",
  side: "BUY",
  quantity: 3,
  price: 0.0001,
  trader: "JSMITH",
  book: "EQUITIES_US",
  counterparty: "Citi",
  status: "ACTIVE",
  version: 1,
  createdAt: "",
  updatedAt: "",
};

describe("CSV export", () => {
  it.each([
    "=1+1",
    "+1",
    "-1",
    "@SUM(A1)",
    "  =1",
    "\t=1",
    "\rtext",
    "\ntext",
    "\uFEFF=1",
    "＝1",
  ])("neutralizes %j", (value) => {
    expect(escapeCsvText(value)).toBe(`"'${value}"`);
  });
  it("escapes quotes, commas and embedded line breaks", () => {
    expect(escapeCsvText('A,"B"\nC')).toBe('"A,""B""\nC"');
  });
  it("preserves ordinary Unicode text", () =>
    expect(escapeCsvText("José")).toBe('"José"'));
  it("exports headers only for empty rows", () =>
    expect(buildTradesCsv([])).toBe(
      "tradeId,tradeDate,symbol,side,quantity,price,trader,book,counterparty,status",
    ));
  it("preserves numeric values and four decimal places", () => {
    expect(buildTradesCsv([trade])).toContain(",3,0.0001,");
    expect(buildTradesCsv([{ ...trade, price: 185.25 }])).toContain(
      ",3,185.2500,",
    );
  });
  it("protects user-controlled fields in exported rows", () =>
    expect(buildTradesCsv([{ ...trade, counterparty: "=1+1" }])).toContain(
      '"\'=1+1"',
    ));
  it("uses CRLF between records", () =>
    expect(buildTradesCsv([trade, trade]).split("\r\n")).toHaveLength(3));
  it("rejects invalid numeric data", () => {
    expect(() => buildTradesCsv([{ ...trade, quantity: NaN }])).toThrow(
      RangeError,
    );
    expect(() => buildTradesCsv([{ ...trade, price: Infinity }])).toThrow(
      RangeError,
    );
  });
});
