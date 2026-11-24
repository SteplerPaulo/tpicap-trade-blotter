import { describe, expect, it } from "vitest";
import { ApiError, createApiError, getErrorMessage } from "./api-error";

describe("API error classification", () => {
  it.each([
    [400, "validation"],
    [422, "validation"],
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not_found"],
    [409, "conflict"],
    [429, "rate_limit"],
    [500, "server"],
    [503, "server"],
    [418, "unknown"],
  ])("classifies HTTP %s as %s", (status, kind) => {
    expect(createApiError(Number(status), null)).toMatchObject({
      status,
      kind,
    });
  });
  it("normalizes legacy validation messages", () => {
    const error = createApiError(400, {
      message: [" Required ", "Required", "", 42],
    });
    expect(error.messages).toEqual(["Required"]);
    expect(error.isValidation).toBe(true);
  });
  it("normalizes structured field errors", () => {
    const error = createApiError(400, {
      message: "Review fields",
      fieldErrors: {
        symbol: [" Invalid ", "Invalid", null],
        quantity: ["Required"],
        price: "invalid",
        book: [],
      },
    });
    expect(error.fieldErrors).toEqual({
      symbol: ["Invalid"],
      quantity: ["Required"],
    });
    expect(error.message).toBe("Review fields");
  });
  it.each([null, [], "bad", 42])(
    "handles malformed field errors: %j",
    (fieldErrors) => {
      expect(
        Object.keys(createApiError(400, { fieldErrors }).fieldErrors),
      ).toEqual([]);
    },
  );
  it("preserves conflict feedback", () => {
    const error = createApiError(409, {
      message: "Trade changed concurrently",
    });
    expect(error.isConflict).toBe(true);
    expect(getErrorMessage(error)).toBe("Trade changed concurrently");
  });
  it("does not expose internal server errors", () => {
    expect(
      createApiError(500, { message: "database secret" }).message,
    ).not.toContain("database secret");
  });
  it("provides safe fallback for unexpected errors", () => {
    expect(getErrorMessage(new Error("secret"))).not.toContain("secret");
  });
  it("identifies network errors without HTTP status", () => {
    const error = new ApiError("Offline", { kind: "network" });
    expect(error.isNetworkError).toBe(true);
    expect(error.status).toBeNull();
  });
});
