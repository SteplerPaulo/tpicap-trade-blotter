import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  LayoutDashboard,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { DashboardMetrics } from "./components/DashboardMetrics";
import { NetPositions } from "./components/NetPositions";
import { TradeTable } from "./components/TradeTable";
import { TradeForm } from "./components/TradeForm";
import { AuditPanel } from "./components/AuditPanel";
import type { TradeInput, Trade, TradeFilters } from "./features/trades/types";
import { downloadTradesCsv } from "./features/trades/csv";
import { tradesApi } from "./lib/api";
import { ApiError, getErrorMessage } from "./lib/api-error";
import { useTradeEvents } from "./hooks/useTradeEvents";

const fmt = new Intl.NumberFormat("en-US");
const initialFilters: TradeFilters = {
  search: "",
  side: "",
  status: "",
  page: 1,
  pageSize: 25,
  sortBy: "tradeDate",
  sortDir: "desc",
};

function normalizeApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(getErrorMessage(error), { kind: "unknown" });
}

export function App() {
  const [filters, setFilters] = useState<TradeFilters>(initialFilters);
  const [draftSearch, setDraftSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Trade | null>(null);
  const [audit, setAudit] = useState<Trade | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Trade | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [saveError, setSaveError] = useState<ApiError | null>(null);
  const [cancelError, setCancelError] = useState<ApiError | null>(null);
  const queryClient = useQueryClient();
  const { connected, lastEvent } = useTradeEvents();
  const { data, isLoading, isFetching, isPlaceholderData, error, refetch } =
    useQuery({
      queryKey: ["trades", filters],
      queryFn: () => tradesApi.list(filters),
      placeholderData: (old) => old,
    });
  const {
    data: summary,
    error: summaryError,
    isFetching: summaryFetching,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["summary"],
    queryFn: tradesApi.summary,
  });
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["trades"] });
    void queryClient.invalidateQueries({ queryKey: ["summary"] });
  };
  const save = useMutation({
    mutationFn: (input: TradeInput) =>
      editing
        ? tradesApi.update(editing.id, { ...input, version: editing.version })
        : tradesApi.create(input),
    retry: false,
    onMutate: () => setSaveError(null),
    onSuccess: () => {
      setFormOpen(false);
      setEditing(null);
      setSaveError(null);
      refresh();
    },
    onError: (error: unknown) => {
      const apiError = normalizeApiError(error);
      setSaveError(apiError);
      if (apiError.isConflict || apiError.kind === "not_found") refresh();
    },
  });
  const cancel = useMutation({
    mutationFn: (trade: Trade) => tradesApi.cancel(trade.id, trade.version),
    retry: false,
    onMutate: () => setCancelError(null),
    onSuccess: () => {
      setCancelTarget(null);
      setCancelError(null);
      refresh();
    },
    onError: (error: unknown) => {
      const apiError = normalizeApiError(error);
      setCancelError(apiError);
      if (apiError.isConflict || apiError.kind === "not_found") refresh();
    },
  });
  const openCreate = useCallback(() => {
    setEditing(null);
    setSaveError(null);
    setFormOpen(true);
  }, []);
  const openEdit = useCallback((trade: Trade) => {
    setEditing(trade);
    setSaveError(null);
    setFormOpen(true);
  }, []);
  const openCancel = useCallback((trade: Trade) => {
    setCancelError(null);
    setCancelTarget(trade);
  }, []);
  const openAudit = useCallback((trade: Trade) => setAudit(trade), []);
  const updateFilter = (changes: Partial<TradeFilters>) =>
    setFilters((p) => ({ ...p, ...changes, page: 1 }));
  const pageData = !isPlaceholderData && !error ? data : undefined;
  const pageOutOfRange = !!pageData && filters.page > pageData.pages;
  useEffect(() => {
    if (pageData && filters.page > pageData.pages) {
      setFilters((current) =>
        current === filters ? { ...current, page: pageData.pages } : current,
      );
    }
  }, [pageData, filters]);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Activity size={23} strokeWidth={2.6} />
          </div>
          <div>
            <strong>
              FUSION<span className="brand-dot">.</span>
            </strong>
            <small>TRADING WORKSPACE</small>
          </div>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <div className="nav-item selected">
          <LayoutDashboard size={18} /> Trade blotter{" "}
          <span className="nav-indicator" />
        </div>
        <div className="nav-item inactive">
          <BarChart3 size={18} /> Positions{" "}
          <span className="small-tag">Overview</span>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-info">
            <ShieldCheck size={19} />
            <div>
              <strong>Demo environment</strong>
              <small>Synthetic trades only</small>
            </div>
          </div>
          <div className="sidebar-note">
            TP ICAP · Take-home assessment
            <br />
            Unofficial engineering prototype
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>Trade blotter</strong>
          </div>
          <div className="top-right">
            <span className={`connection ${connected ? "online" : "offline"}`}>
              {connected ? <Wifi size={15} /> : <WifiOff size={15} />}{" "}
              {connected ? "LIVE CONNECTED" : "RECONNECTING"}
            </span>
            <span className="avatar">FT</span>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <span className="eyebrow">EQUITIES · EXECUTION OPERATIONS</span>
              <h1>Trade blotter</h1>
              <p>
                Monitor, manage and reconcile executed equity trades in real
                time.
              </p>
            </div>
            <button
              className="btn btn-primary create-button"
              onClick={openCreate}
            >
              <Plus size={18} /> New trade
            </button>
          </div>
          <DashboardMetrics
            summary={summary}
            connected={connected}
            lastEvent={lastEvent}
          />
          {summaryError ? (
            <div className="inline-error summary-notice" role="alert">
              {summary
                ? "Summary refresh failed. Showing last successful values."
                : "Trade summary unavailable."}{" "}
              <button onClick={() => void refetchSummary()}>Retry</button>
            </div>
          ) : (
            summaryFetching && (
              <p className="muted summary-notice" role="status">
                {summary ? "Updating summary…" : "Loading summary…"}
              </p>
            )
          )}
          <section className="workspace-card">
            <div className="panel-heading">
              <div>
                <h2>
                  Trade executions{" "}
                  <span className="count-chip">
                    {pageData ? fmt.format(pageData.total) : "—"}
                  </span>
                </h2>
                <p>All equity executions across trading books</p>
              </div>
              <div className="panel-actions">
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    refresh();
                  }}
                >
                  <RefreshCw size={16} className={isFetching ? "spin" : ""} />{" "}
                  Refresh
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => downloadTradesCsv(data?.data ?? [])}
                  disabled={
                    !pageData?.data.length || isFetching || pageOutOfRange
                  }
                >
                  <Download size={16} /> Export page
                </button>
              </div>
            </div>
            <div className="filters">
              <form
                className="search"
                onSubmit={(e) => {
                  e.preventDefault();
                  updateFilter({ search: draftSearch.trim() });
                }}
              >
                <Search size={17} />
                <input
                  aria-label="Search trades"
                  placeholder="Search symbol, trade ID, trader, book..."
                  value={draftSearch}
                  onChange={(e) => {
                    setDraftSearch(e.target.value);
                    if (!e.target.value) updateFilter({ search: "" });
                  }}
                />
                <button type="submit" aria-label="Apply search">
                  Search
                </button>
              </form>
              <div className="filters-right">
                <SlidersHorizontal size={16} />
                <select
                  aria-label="Filter side"
                  value={filters.side}
                  onChange={(e) => updateFilter({ side: e.target.value })}
                >
                  <option value="">All sides</option>
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                </select>
                <select
                  aria-label="Filter status"
                  value={filters.status}
                  onChange={(e) => updateFilter({ status: e.target.value })}
                >
                  <option value="">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <button
                  className="filter-reset"
                  onClick={() => {
                    setDraftSearch("");
                    setFilters(initialFilters);
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
            {error && (
              <div className="inline-error" role="alert">
                {getErrorMessage(error)}{" "}
                <button onClick={() => void refetch()}>Retry</button>
              </div>
            )}
            {(isLoading || isPlaceholderData || pageOutOfRange) && (
              <div className="loading-state" role="status">
                <RefreshCw className="spin" size={24} /> Loading trades...
              </div>
            )}
            {pageData && !pageOutOfRange && (
              <TradeTable
                trades={pageData.data}
                filters={filters}
                setFilters={setFilters}
                onEdit={openEdit}
                onCancel={openCancel}
                onAudit={openAudit}
              />
            )}
            {isFetching && pageData && !pageOutOfRange && (
              <div className="table-refresh-status" role="status">
                Updating trades…
              </div>
            )}
            <div className="table-footer">
              <div>
                Showing{" "}
                <strong>
                  {pageData?.data.length
                    ? (pageData.page - 1) * pageData.pageSize + 1
                    : 0}
                  –
                  {pageData?.data.length
                    ? (pageData.page - 1) * pageData.pageSize +
                      pageData.data.length
                    : 0}
                </strong>{" "}
                of{" "}
                <strong>{pageData ? fmt.format(pageData.total) : "—"}</strong>{" "}
                trades <span className="footer-divider">|</span> Rows{" "}
                <select
                  aria-label="Rows per page"
                  value={filters.pageSize}
                  onChange={(e) =>
                    updateFilter({ pageSize: Number(e.target.value) })
                  }
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="pagination">
                <span>
                  Page {filters.page} of {pageData?.pages ?? "—"}
                </span>
                <button
                  className="icon-button"
                  aria-label="Previous page"
                  disabled={!pageData || pageOutOfRange || filters.page <= 1}
                  onClick={() =>
                    setFilters((f) => ({ ...f, page: f.page - 1 }))
                  }
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Next page"
                  disabled={
                    !pageData ||
                    pageOutOfRange ||
                    filters.page >= pageData.pages
                  }
                  onClick={() =>
                    setFilters((f) => ({ ...f, page: f.page + 1 }))
                  }
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </section>
          <section className="bottom-grid">
            <NetPositions summary={summary} failed={!!summaryError} />
            <div className="insight-card guidance">
              <div className="insight-head">
                <h3>
                  <CircleHelp size={18} /> Blotter guide
                </h3>
                <button
                  className="text-button"
                  onClick={() => setShowHelp((v) => !v)}
                >
                  {showHelp ? "Hide" : "Learn more"}
                </button>
              </div>
              <p>
                Trades are persisted in PostgreSQL. Create, amend, or cancel a
                trade to broadcast changes instantly to connected browsers.
              </p>
              {showHelp && (
                <div className="help-extra">
                  Open a second browser window to test live updates. Concurrent
                  edits use version checks; conflicts ask you to refresh. Every
                  post-seed mutation creates an audit event.
                </div>
              )}
              <div className="guide-footer">
                <span className="green-dot" /> Synthetic data · No live market
                connectivity
              </div>
            </div>
          </section>
          <footer className="footer">
            FUSION TRADING WORKSPACE
            <span>
              Unofficial demonstration · Built for technical assessment
            </span>
          </footer>
        </div>
      </main>
      {formOpen && (
        <TradeForm
          key={editing?.id ?? "create"}
          trade={editing}
          busy={save.isPending}
          error={saveError}
          onReconcile={(latest) => {
            setEditing(latest);
            setSaveError(null);
          }}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
            setSaveError(null);
          }}
          onSubmit={async (input) => {
            await save.mutateAsync(input);
          }}
        />
      )}
      {audit && <AuditPanel trade={audit} onClose={() => setAudit(null)} />}
      {cancelTarget && (
        <div
          className="backdrop"
          onMouseDown={(e) => {
            if (!cancel.isPending && e.target === e.currentTarget) {
              setCancelTarget(null);
              setCancelError(null);
            }
          }}
        >
          <section
            className="modal confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirm trade cancellation"
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">CONFIRM ACTION</span>
                <h2>Cancel trade?</h2>
                <p>
                  {cancelTarget.tradeId} · {cancelTarget.symbol} ·{" "}
                  {cancelTarget.side}
                </p>
              </div>
              <button
                className="icon-button"
                disabled={cancel.isPending}
                onClick={() => {
                  setCancelTarget(null);
                  setCancelError(null);
                }}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>
            <p>
              The trade will be marked <strong>CANCELLED</strong>, retained in
              the audit record and immediately reflected in connected clients.
              This action cannot be undone.
            </p>
            {cancelError && (
              <div role="alert" className="form-error">
                {cancelError.message}
                {(cancelError.isConflict ||
                  cancelError.kind === "not_found") && (
                  <p>
                    Close this dialog and review the latest trade details before
                    attempting another cancellation.
                  </p>
                )}
              </div>
            )}
            <div className="modal-actions">
              <button
                className="btn btn-ghost"
                disabled={cancel.isPending}
                onClick={() => {
                  setCancelTarget(null);
                  setCancelError(null);
                }}
              >
                {cancelError?.isConflict || cancelError?.kind === "not_found"
                  ? "Close"
                  : "Keep trade"}
              </button>
              <button
                className="btn btn-danger"
                disabled={
                  cancel.isPending ||
                  cancelError?.isConflict ||
                  cancelError?.kind === "not_found"
                }
                onClick={() => cancel.mutate(cancelTarget)}
              >
                {cancel.isPending && <RefreshCw size={16} className="spin" />}
                {cancel.isPending ? "Cancelling..." : "Cancel trade"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
