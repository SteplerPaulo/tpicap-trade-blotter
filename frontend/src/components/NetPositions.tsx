import { BarChart3 } from "lucide-react";
import type { Summary } from "../features/trades/types";

const fmt = new Intl.NumberFormat("en-US");

export function NetPositions({
  summary,
  failed,
}: {
  summary?: Summary;
  failed: boolean;
}) {
  const maxQuantity = Math.max(
    1,
    ...(summary?.positions.map((p) => Math.abs(p.netQuantity)) ?? []),
  );
  return (
    <div className="insight-card">
      <div className="insight-head">
        <h3>
          <BarChart3 size={18} /> Net positions by symbol
        </h3>
        <span>ACTIVE ONLY</span>
      </div>
      {!summary ? (
        <p className="muted">
          {failed ? "Position data unavailable." : "Loading positions…"}
        </p>
      ) : summary.positions.length ? (
        <div className="positions">
          {summary.positions.slice(0, 5).map((p) => (
            <div className="position" key={p.symbol}>
              <strong>{p.symbol}</strong>
              <div className="position-track">
                <div
                  className={`position-bar ${p.netQuantity >= 0 ? "long" : "short"}`}
                  style={{
                    width: `${(Math.abs(p.netQuantity) / maxQuantity) * 100}%`,
                  }}
                />
              </div>
              <span
                className={
                  p.netQuantity === 0
                    ? "muted"
                    : p.netQuantity > 0
                      ? "positive"
                      : "negative"
                }
              >
                {p.netQuantity > 0 ? "+" : ""}
                {fmt.format(p.netQuantity)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">No open positions.</p>
      )}
    </div>
  );
}
