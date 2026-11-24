import type {
  Audit,
  Summary,
  Trade,
  TradeFilters,
  TradeInput,
  TradeList,
} from "../features/trades/types";

import { ApiError, createApiError } from "./api-error";

export const API = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);

  headers.set("Accept", "application/json");

  if (options?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${API}/api${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw new ApiError(
      "Unable to reach the API. Check your connection and try again.",
      { kind: "network" },
    );
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);

    throw createApiError(response.status, body);
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw new ApiError(
      "The server returned an invalid response. Please try again.",
      {
        kind: "invalid_response",
        status: response.status,
      },
    );
  }
}

export const tradesApi = {
  list: (filters: TradeFilters) =>
    request<TradeList>(
      `/trades?${new URLSearchParams(
        Object.entries(filters)
          .filter(([, value]) => value !== "")
          .map(([key, value]) => [key, String(value)]),
      ).toString()}`,
    ),

  summary: () => request<Summary>("/trades/summary"),

  get: (id: string) => request<Trade>(`/trades/${id}`),

  create: (data: TradeInput) =>
    request<Trade>("/trades", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<TradeInput> & { version: number }) =>
    request<Trade>(`/trades/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  cancel: (id: string, version: number) =>
    request<Trade>(`/trades/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ version }),
    }),

  audit: (id: string) => request<Audit[]>(`/trades/${id}/audit`),
};
