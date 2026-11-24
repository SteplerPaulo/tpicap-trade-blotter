import type { Trade, TradeInput } from "./types";

export type Field = keyof TradeInput;
export type Choice = "mine" | "server";
const fields: { key: Field; label: string }[] = [
  { key: "symbol", label: "Symbol" },
  { key: "side", label: "Side" },
  { key: "quantity", label: "Quantity" },
  { key: "price", label: "Price (USD)" },
  { key: "trader", label: "Trader" },
  { key: "book", label: "Book" },
  { key: "counterparty", label: "Counterparty" },
];

export function conflictRows(
  original: Trade,
  latest: Trade,
  draft: TradeInput,
) {
  return fields.map(({ key, label }) => {
    const mineChanged = draft[key] !== original[key];
    const serverChanged = latest[key] !== original[key];
    return {
      key,
      label,
      mineChanged,
      serverChanged,
      conflict: mineChanged && serverChanged && draft[key] !== latest[key],
    };
  });
}

export function reconcileTrade(
  original: Trade,
  latest: Trade,
  draft: TradeInput,
  choices: Partial<Record<Field, Choice>> = {},
): TradeInput | null {
  const rows = conflictRows(original, latest, draft);
  if (
    latest.status !== "ACTIVE" ||
    rows.some((row) => row.conflict && !choices[row.key])
  )
    return null;
  return Object.fromEntries(
    rows.map((row) => [
      row.key,
      (row.conflict ? choices[row.key] === "mine" : row.mineChanged)
        ? draft[row.key]
        : latest[row.key],
    ]),
  ) as TradeInput;
}
