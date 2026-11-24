import { useQuery } from "@tanstack/react-query";
import { X, History } from "lucide-react";
import { tradesApi } from "../lib/api";
import type { Trade } from "../features/trades/types";

export function AuditPanel({
  trade,
  onClose,
}: {
  trade: Trade;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["audit", trade.id],
    queryFn: () => tradesApi.audit(trade.id),
  });
  
  return (
    <div
      className="backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="modal audit-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Trade audit trail"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">IMMUTABLE EVENT HISTORY</span>
            <h2>
              <History size={21} /> Trade activity
            </h2>
            <p>
              {trade.tradeId} · {trade.symbol}
            </p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </div>
        {isLoading && <p className="muted">Loading history…</p>}
        {error && <p className="form-error">{(error as Error).message}</p>}
        <div className="timeline">
          {data?.length === 0 && (
            <p className="muted">
              No audit events for this trade (seed data does not contain
              historical events).
            </p>
          )}
          {data?.map((event) => (
            <div className="timeline-event" key={event.id}>
              <div className="timeline-dot" />
              <div>
                <strong>{event.action}</strong>
                <small>{new Date(event.createdAt).toLocaleString()}</small>
                <pre>
                  {JSON.stringify(
                    { before: event.before, after: event.after },
                    null,
                    2,
                  )}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
