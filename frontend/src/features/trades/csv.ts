import type { Trade } from "./types";
import { priceUnits } from "./money";

const columns = [
  "tradeId",
  "tradeDate",
  "symbol",
  "side",
  "quantity",
  "price",
  "trader",
  "book",
  "counterparty",
  "status",
] as const;

/** Neutralize formula-like text before CSV quoting. Spreadsheet behavior varies. */
export function escapeCsvText(value: string): string {
  const unsafe =
    /^[\s\u0000-\u001f\u007f\uFEFF]*[=+\-@＝＋－＠]/u.test(value) ||
    /^[\t\r\n]/.test(value);
  const text = unsafe ? "'" + value : value;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildTradesCsv(rows: readonly Trade[]): string {
  return [
    columns.join(","),
    ...rows.map((row) =>
      columns
        .map((key) => {
          if (key === "quantity") {
            if (
              !Number.isInteger(row.quantity) ||
              row.quantity < 1 ||
              row.quantity > 1_000_000_000
            )
              throw new RangeError("Invalid trade quantity");
            return String(row.quantity);
          }
          if (key === "price") {
            const units = priceUnits(row.price);
            return `${units / 10000n}.${(units % 10000n).toString().padStart(4, "0")}`;
          }
          return escapeCsvText(row[key]);
        })
        .join(","),
    ),
  ].join("\r\n");
}

export function downloadTradesCsv(rows: readonly Trade[]): void {
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", buildTradesCsv(rows)], {
      type: "text/csv;charset=utf-8",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `fusion-trades-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
