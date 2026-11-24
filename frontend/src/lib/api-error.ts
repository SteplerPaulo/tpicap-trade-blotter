export type ApiErrorKind =
  | "network"
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limit"
  | "server"
  | "invalid_response"
  | "unknown";

type ApiErrorOptions = {
  kind: ApiErrorKind;
  status?: number;
  messages?: string[];
  fieldErrors?: Record<string, string[]>;
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly messages: readonly string[];
  readonly fieldErrors: Readonly<Record<string, readonly string[]>>;

  constructor(message: string, options: ApiErrorOptions) {
    super(message);

    this.name = "ApiError";
    this.kind = options.kind;
    this.status = options.status ?? null;
    this.messages = options.messages ?? [];
    this.fieldErrors = options.fieldErrors ?? {};
  }

  get isConflict(): boolean {
    return this.kind === "conflict";
  }

  get isValidation(): boolean {
    return this.kind === "validation";
  }

  get isNetworkError(): boolean {
    return this.kind === "network";
  }
}

function extractMessages(body: unknown): string[] {
  if (typeof body !== "object" || body === null || !("message" in body)) {
    return [];
  }

  const message = body.message;

  const messages = Array.isArray(message) ? message : [message];

  return [
    ...new Set(
      messages
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

function extractFieldErrors(body: unknown): Record<string, string[]> {
  const result: Record<string, string[]> = Object.create(null);
  if (!body || typeof body !== "object" || !("fieldErrors" in body))
    return result;
  const fields = body.fieldErrors;
  if (!fields || typeof fields !== "object" || Array.isArray(fields))
    return result;
  for (const [field, values] of Object.entries(fields)) {
    if (!Array.isArray(values)) continue;
    const messages = [
      ...new Set(
        values
          .filter((v): v is string => typeof v === "string")
          .map((v) => v.trim())
          .filter(Boolean),
      ),
    ];
    if (messages.length) result[field] = messages;
  }
  return result;
}

export function createApiError(status: number, body: unknown): ApiError {
  const messages = extractMessages(body);

  switch (status) {
    case 400:
    case 422:
      return new ApiError(
        messages.join(" · ") || "Please review the submitted information.",
        {
          kind: "validation",
          status,
          messages,
          fieldErrors: extractFieldErrors(body),
        },
      );

    case 401:
      return new ApiError("Authentication is required.", {
        kind: "unauthorized",
        status,
      });

    case 403:
      return new ApiError(
        "You do not have permission to perform this action.",
        { kind: "forbidden", status },
      );

    case 404:
      return new ApiError(
        messages[0] || "The requested resource was not found.",
        { kind: "not_found", status },
      );

    case 409:
      return new ApiError(
        messages[0] || "The record has changed. Refresh and try again.",
        {
          kind: "conflict",
          status,
          messages,
        },
      );

    case 429:
      return new ApiError("Too many requests. Please try again shortly.", {
        kind: "rate_limit",
        status,
      });

    default:
      if (status >= 500 && status <= 599) {
        return new ApiError(
          "The server is temporarily unable to process your request. Please try again later.",
          { kind: "server", status },
        );
      }

      return new ApiError(`Unable to complete the request (${status}).`, {
        kind: "unknown",
        status,
      });
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}
