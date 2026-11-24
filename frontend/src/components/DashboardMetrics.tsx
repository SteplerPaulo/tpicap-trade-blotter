import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Database,
  Wifi,
  X,
} from "lucide-react";
import type { Summary } from "../features/trades/types";

const fmt = new Intl.NumberFormat("en-US");
const formatCount = (value: number | undefined) =>
  value === undefined ? "—" : fmt.format(value);

type Props = { summary?: Summary; connected: boolean; lastEvent: string };

export function DashboardMetrics({ summary, connected, lastEvent }: Props) {
  return (
    <div className="metrics">
      <div className="metric-card">
        <div className="metric-label">
          TOTAL TRADES <Database size={17} />
        </div>
        <div className="metric-value">
          {formatCount(summary?.totalCount)}
          <span className="metric-sub">in blotter</span>
        </div>
        <div className="metric-foot">All recorded executions</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">
          ACTIVE TRADES <Activity size={17} />
        </div>
        <div className="metric-value">
          {formatCount(summary?.activeCount)}
          <span className="metric-arrow up">
            <ArrowUpRight size={17} />
          </span>
        </div>
        <div className="metric-foot">
          <span className="green-dot" /> Recorded active trades
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-label">
          CANCELLED TRADES <X size={17} />
        </div>
        <div className="metric-value">
          {formatCount(summary?.cancelledCount)}
          <span className="metric-arrow">
            <ArrowDownRight size={17} />
          </span>
        </div>
        <div className="metric-foot">Retained for audit visibility</div>
      </div>
      <div className="metric-card connectivity">
        <div className="metric-label">
          TRADE EVENT STATUS <Wifi size={17} />
        </div>
        <div className="metric-value metric-live">
          {connected ? "Streaming" : "Offline"}
          <span className={`pulse-dot ${connected ? "" : "disconnected"}`} />
        </div>
        <div className="metric-foot">
          {lastEvent
            ? `Latest event: ${lastEvent}`
            : "Multi-client trade event feed"}
        </div>
      </div>
    </div>
  );
}
