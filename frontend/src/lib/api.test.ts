import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API, tradesApi } from "./api";
import type { TradeInput } from "../features/trades/types";

const input: TradeInput = {
  symbol: "AAPL",
  side: "BUY",
  quantity: 100,
  price: 185.25,
  trader: "JSMITH",
  book: "EQUITIES_US",
  counterparty: "Citi",
};
const fetchMock = vi.fn<typeof fetch>();
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("trade API client", () => {
  it("fetches a trade with JSON accept header", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "abc", version: 2 }));
    await expect(tradesApi.get("abc")).resolves.toMatchObject({ version: 2 });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API}/api/trades/abc`);
    expect(new Headers(options?.headers).get("Accept")).toBe(
      "application/json",
    );
    expect(new Headers(options?.headers).has("Content-Type")).toBe(false);
  });
  it("creates a trade with JSON body", async () => {
    fetchMock.mockResolvedValueOnce(json(input, 201));
    await tradesApi.create(input);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API}/api/trades`);
    expect(options?.method).toBe("POST");
    expect(options?.body).toBe(JSON.stringify(input));
    expect(new Headers(options?.headers).get("Content-Type")).toBe(
      "application/json",
    );
  });
  it("includes amendment version and does not retry conflicts", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ message: "Trade changed concurrently" }, 409),
    );
    await expect(
      tradesApi.update("abc", { quantity: 200, version: 2 }),
    ).rejects.toMatchObject({ kind: "conflict", status: 409 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ quantity: 200, version: 2 }),
    });
  });
  it("includes cancellation version", async () => {
    fetchMock.mockResolvedValueOnce(json({ status: "CANCELLED" }));
    await tradesApi.cancel("abc", 3);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API}/api/trades/abc/cancel`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ version: 3 }),
      }),
    );
  });
  it("preserves structured validation errors", async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        { message: "Review fields", fieldErrors: { quantity: ["Required"] } },
        400,
      ),
    );
    await expect(tradesApi.create(input)).rejects.toMatchObject({
      kind: "validation",
      fieldErrors: { quantity: ["Required"] },
    });
  });
  it("classifies network failures", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(tradesApi.summary()).rejects.toMatchObject({
      kind: "network",
      status: null,
    });
  });
  it("preserves aborted requests", async () => {
    const error = new Error("Aborted");
    error.name = "AbortError";
    fetchMock.mockRejectedValueOnce(error);
    await expect(tradesApi.summary()).rejects.toBe(error);
  });
  it("handles malformed successful responses", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("<html>bad</html>", { status: 200 }),
    );
    await expect(tradesApi.summary()).rejects.toMatchObject({
      kind: "invalid_response",
      status: 200,
    });
  });
  it("handles non-JSON gateway errors", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("Bad gateway", { status: 502 }),
    );
    await expect(tradesApi.summary()).rejects.toMatchObject({
      kind: "server",
      status: 502,
    });
  });
  it("encodes filters and omits empty values", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [], total: 0 }));
    await tradesApi.list({
      search: "A & B",
      side: "",
      status: "ACTIVE",
      page: 1,
      pageSize: 25,
      sortBy: "tradeDate",
      sortDir: "desc",
    });
    const url = new URL(String(fetchMock.mock.calls[0][0]), "http://localhost");
    expect(url.searchParams.get("search")).toBe("A & B");
    expect(url.searchParams.has("side")).toBe(false);
    expect(url.searchParams.get("status")).toBe("ACTIVE");
  });
});
