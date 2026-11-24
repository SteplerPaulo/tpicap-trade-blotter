import { useState } from "react";
import type { Trade, TradeInput } from "../features/trades/types";

import {
  conflictRows,
  reconcileTrade,
  type Field,
  type Choice,
} from "../features/trades/conflict";

type Props = {
  original: Trade;
  latest: Trade;
  draft: TradeInput;
  onApply: (merged: TradeInput) => void;
};

export function TradeConflictPanel({
  original,
  latest,
  draft,
  onApply,
}: Props) {
  const [choices, setChoices] = useState<Partial<Record<Field, Choice>>>({});
  const rows = conflictRows(original, latest, draft);
  const unresolved = rows.some((row) => row.conflict && !choices[row.key]);
  const apply = () => {
    const merged = reconcileTrade(original, latest, draft, choices);
    if (merged) onApply(merged);
  };
  if (latest.status !== "ACTIVE") {
    return (
      <p className="form-error" role="alert">
        This trade has been cancelled. Amendments are no longer allowed.
      </p>
    );
  }
  return (
    <section className="conflict-panel" aria-label="Review concurrent changes">
      <h3>
        Review version {original.version} → {latest.version}
      </h3>
      <p>
        Server-only changes are retained. Choose a value for each overlapping
        change.
      </p>
      <div className="conflict-scroll">
        <table className="conflict-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Original</th>
              <th>Server</th>
              <th>Yours</th>
              <th>Resolution</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((row) => row.mineChanged || row.serverChanged)
              .map((row) => (
                <tr key={row.key}>
                  <th scope="row">{row.label}</th>
                  <td>{String(original[row.key])}</td>
                  <td>{String(latest[row.key])}</td>
                  <td>{String(draft[row.key])}</td>
                  <td>
                    {row.conflict ? (
                      <select
                        aria-label={`Resolve ${row.label}`}
                        value={choices[row.key] ?? ""}
                        onChange={(event) =>
                          setChoices((prev) => ({
                            ...prev,
                            [row.key]: event.target.value as Choice,
                          }))
                        }
                      >
                        <option value="">Choose...</option>
                        <option value="server">Server</option>
                        <option value="mine">Mine</option>
                      </select>
                    ) : row.mineChanged ? (
                      "Yours"
                    ) : (
                      "Server"
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="btn btn-primary"
        disabled={unresolved}
        onClick={apply}
      >
        Apply reviewed changes
      </button>
      <p>This updates the form only. Review it and save separately.</p>
    </section>
  );
}
