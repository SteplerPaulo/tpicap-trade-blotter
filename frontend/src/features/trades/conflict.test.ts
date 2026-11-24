import { describe, expect, it } from "vitest";
import { conflictRows, reconcileTrade } from "./conflict";
import type { Trade, TradeInput } from "./types";

const draft: TradeInput = {
  symbol: "AAPL",
  side: "BUY",
  quantity: 100,
  price: 12.34,
  trader: "JSMITH",
  book: "CORE",
  counterparty: "Citi",
};
const original: Trade = {
  ...draft,
  id: "1",
  tradeId: "TRD-1",
  version: 1,
  status: "ACTIVE",
  tradeDate: "2026-11-24",
  createdAt: "2026-11-24",
  updatedAt: "2026-11-24",
};
const latest: Trade = { ...original, version: 2 };

describe("trade conflict reconciliation", () => {
  it("returns unchanged editable fields only", () =>
    expect(reconcileTrade(original, latest, draft)).toEqual(draft));
  it("preserves server-only changes", () =>
    expect(
      reconcileTrade(original, { ...latest, quantity: 200 }, draft),
    ).toEqual({ ...draft, quantity: 200 }));
  it("preserves local-only changes", () =>
    expect(reconcileTrade(original, latest, { ...draft, price: 20 })).toEqual({
      ...draft,
      price: 20,
    }));
  it("merges disjoint changes", () =>
    expect(
      reconcileTrade(
        original,
        { ...latest, quantity: 200 },
        { ...draft, price: 20 },
      ),
    ).toEqual({ ...draft, quantity: 200, price: 20 }));
  it("accepts identical concurrent edits", () =>
    expect(
      reconcileTrade(
        original,
        { ...latest, quantity: 200 },
        { ...draft, quantity: 200 },
      ),
    ).toEqual({ ...draft, quantity: 200 }));
  it("flags overlapping changes", () =>
    expect(
      conflictRows(
        original,
        { ...latest, quantity: 200 },
        { ...draft, quantity: 300 },
      )
        .filter((row) => row.conflict)
        .map((row) => row.key),
    ).toEqual(["quantity"]));
  it("blocks unresolved conflicts", () =>
    expect(
      reconcileTrade(
        original,
        { ...latest, quantity: 200 },
        { ...draft, quantity: 300 },
      ),
    ).toBeNull());
  it("accepts local resolution", () =>
    expect(
      reconcileTrade(
        original,
        { ...latest, quantity: 200 },
        { ...draft, quantity: 300 },
        { quantity: "mine" },
      ),
    ).toEqual({ ...draft, quantity: 300 }));
  it("accepts server resolution", () =>
    expect(
      reconcileTrade(
        original,
        { ...latest, quantity: 200 },
        { ...draft, quantity: 300 },
        { quantity: "server" },
      ),
    ).toEqual({ ...draft, quantity: 200 }));
  it("requires resolution of every overlap", () =>
    expect(
      reconcileTrade(
        original,
        { ...latest, quantity: 200, price: 20 },
        { ...draft, quantity: 300, price: 30 },
        { quantity: "mine" },
      ),
    ).toBeNull());
  it("blocks cancelled trades", () =>
    expect(
      reconcileTrade(original, { ...latest, status: "CANCELLED" }, draft),
    ).toBeNull());
});
