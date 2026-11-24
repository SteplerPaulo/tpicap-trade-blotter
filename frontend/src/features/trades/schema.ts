import { z } from "zod";

export const tradeSchema = z.object({
  symbol: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, "Symbol is required")
    .max(16, "Symbol must not exceed 16 characters")
    .regex(/^[A-Z0-9.]+$/, "Enter a valid ticker (e.g. AAPL)"),

  side: z.enum(["BUY", "SELL"], {
    error: "Select a valid trade side",
  }),

  quantity: z
    .number({
      error: (issue) =>
        issue.input === undefined
          ? "Quantity is required"
          : "Enter a valid quantity",
    })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(1_000_000_000, "Quantity must not exceed 1 billion"),

  price: z
    .number({
      error: (issue) =>
        issue.input === undefined ? "Price is required" : "Enter a valid price",
    })
    .min(0.0001, "Price must be at least 0.0001")
    .max(1_000_000_000, "Price must not exceed 1 billion")
    .refine(
      (value) => Number(value.toFixed(4)) === value,
      "Price must not exceed 4 decimal places",
    ),

  trader: z
    .string()
    .trim()
    .min(2, "Trader must contain at least 2 characters")
    .max(64, "Trader must not exceed 64 characters")
    .regex(
      /^[A-Za-z0-9_.-]+$/,
      "Trader may only contain letters, digits, underscores, periods and hyphens",
    ),

  book: z
    .string()
    .trim()
    .min(1, "Book is required")
    .max(64, "Book must not exceed 64 characters"),

  counterparty: z
    .string()
    .trim()
    .min(1, "Counterparty is required")
    .max(100, "Counterparty must not exceed 100 characters"),
});
