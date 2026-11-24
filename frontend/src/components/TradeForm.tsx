import type { ApiError } from "../lib/api-error";
import { useEffect, useState } from "react";
import { tradesApi } from "../lib/api";
import { getErrorMessage } from "../lib/api-error";
import { TradeConflictPanel } from "./TradeConflictPanel";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, LoaderCircle } from "lucide-react";

import { tradeSchema } from "../features/trades/schema";
import type { Trade, TradeInput } from "../features/trades/types";

type Props = {
  trade?: Trade | null;
  busy: boolean;
  error: ApiError | null;
  onClose: () => void;
  onReconcile: (latest: Trade) => void;
  onSubmit: (input: TradeInput) => Promise<void>;
};

const defaultValues: TradeInput = {
  symbol: "",
  side: "BUY",
  quantity: 100,
  price: 100,
  trader: "",
  book: "EQUITIES_US",
  counterparty: "",
};

function getFormValues(trade?: Trade | null): TradeInput {
  if (!trade) return { ...defaultValues };

  return {
    symbol: trade.symbol,
    side: trade.side,
    quantity: trade.quantity,
    price: trade.price,
    trader: trade.trader,
    book: trade.book,
    counterparty: trade.counterparty,
  };
}

export function TradeForm({
  trade,
  busy,
  error,
  onClose,
  onSubmit,
  onReconcile,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TradeInput>({
    resolver: zodResolver(tradeSchema),
    defaultValues: getFormValues(trade),
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const formFields = [
    "symbol",
    "side",
    "quantity",
    "price",
    "trader",
    "book",
    "counterparty",
  ] as const;
  useEffect(() => {
    if (!error?.isValidation) return;
    for (const field of [
      "symbol",
      "side",
      "quantity",
      "price",
      "trader",
      "book",
      "counterparty",
    ] as const) {
      const messages = error.fieldErrors[field];
      if (messages?.length)
        setError(field, { type: "server", message: messages.join(" · ") });
    }
  }, [error, setError]);
  const unmappedErrors = Object.entries(error?.fieldErrors ?? {})
    .filter(([field]) => !formFields.some((name) => name === field))
    .flatMap(([field, messages]) =>
      messages.map((message) => `${field}: ${message}`),
    );

  const [latest, setLatest] = useState<Trade | null>(null);
  const [draft, setDraft] = useState<TradeInput | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [reloadError, setReloadError] = useState("");

  const reloadLatest = async () => {
    if (!trade || loadingLatest) return;
    setLoadingLatest(true);
    setReloadError("");
    setLatest(null);
    try {
      const snapshot = await tradesApi.get(trade.id);
      setLatest(snapshot);
    } catch (err) {
      setReloadError(getErrorMessage(err));
    } finally {
      setLoadingLatest(false);
    }
  };

  const submitting = busy || isSubmitting || loadingLatest;
  const hasConflict = error?.kind === "conflict";
  const isMissing = error?.kind === "not_found";
  const submissionBlocked = hasConflict || isMissing;

  const submit = async (input: TradeInput) => {
    if (submissionBlocked) return;
    setDraft(input);
    try {
      await onSubmit(input);
    } catch {
      // API errors are managed by the parent component.
    }
  };

  return (
    <div
      className="backdrop"
      onMouseDown={(e) => {
        if (!submitting && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={trade ? "Amend trade" : "New trade"}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">TRADE MANAGEMENT</span>

            <h2>{trade ? "Amend trade" : "New equity trade"}</h2>

            <p>
              {trade
                ? `${trade.tradeId} · Version ${trade.version}`
                : "Enter the execution details below."}
            </p>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>

        <form noValidate onSubmit={handleSubmit(submit)}>
          <fieldset
            disabled={submitting || hasConflict || isMissing}
            className="trade-form-fields"
          >
            <div className="form-grid">
              <label>
                Symbol
                <input
                  placeholder="AAPL"
                  autoComplete="off"
                  style={{ textTransform: "uppercase" }}
                  aria-invalid={!!errors.symbol}
                  aria-describedby={errors.symbol ? "symbol-error" : undefined}
                  {...register("symbol")}
                />
                {errors.symbol && (
                  <span id="symbol-error" className="field-error" role="alert">
                    {errors.symbol.message}
                  </span>
                )}
              </label>

              <label>
                Side
                <select
                  aria-invalid={!!errors.side}
                  aria-describedby={errors.side ? "side-error" : undefined}
                  {...register("side")}
                >
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
                {errors.side && (
                  <span id="side-error" className="field-error" role="alert">
                    {errors.side.message}
                  </span>
                )}
              </label>

              <label>
                Quantity
                <input
                  type="number"
                  min="1"
                  max="1000000000"
                  step="1"
                  aria-invalid={!!errors.quantity}
                  aria-describedby={
                    errors.quantity ? "quantity-error" : undefined
                  }
                  {...register("quantity", {
                    valueAsNumber: true,
                  })}
                />
                {errors.quantity && (
                  <span
                    id="quantity-error"
                    className="field-error"
                    role="alert"
                  >
                    {errors.quantity.message}
                  </span>
                )}
              </label>

              <label>
                Price (USD)
                <input
                  type="number"
                  min="0.0001"
                  max="1000000000"
                  step="0.0001"
                  aria-invalid={!!errors.price}
                  aria-describedby={errors.price ? "price-error" : undefined}
                  {...register("price", {
                    valueAsNumber: true,
                  })}
                />
                {errors.price && (
                  <span id="price-error" className="field-error" role="alert">
                    {errors.price.message}
                  </span>
                )}
              </label>

              <label>
                Trader
                <input
                  placeholder="JSMITH"
                  autoComplete="off"
                  aria-invalid={!!errors.trader}
                  aria-describedby={errors.trader ? "trader-error" : undefined}
                  {...register("trader")}
                />
                {errors.trader && (
                  <span id="trader-error" className="field-error" role="alert">
                    {errors.trader.message}
                  </span>
                )}
              </label>

              <label>
                Book
                <input
                  aria-invalid={!!errors.book}
                  aria-describedby={errors.book ? "book-error" : undefined}
                  {...register("book")}
                />
                {errors.book && (
                  <span id="book-error" className="field-error" role="alert">
                    {errors.book.message}
                  </span>
                )}
              </label>

              <label className="full">
                Counterparty
                <input
                  placeholder="Goldman Sachs"
                  aria-invalid={!!errors.counterparty}
                  aria-describedby={
                    errors.counterparty ? "counterparty-error" : undefined
                  }
                  {...register("counterparty")}
                />
                {errors.counterparty && (
                  <span
                    id="counterparty-error"
                    className="field-error"
                    role="alert"
                  >
                    {errors.counterparty.message}
                  </span>
                )}
              </label>
            </div>
          </fieldset>

          {error && (
            <div className="form-error" role="alert">
              {error.isValidation && error.messages.length > 1 ? (
                <ul className="api-error-list">
                  {error.messages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : (
                <span>{error.message}</span>
              )}
              {unmappedErrors.length > 0 && (
                <ul className="api-error-list">
                  {unmappedErrors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              )}
              {hasConflict && (
                <p>
                  Your unsaved changes are preserved. Load the latest version to
                  reconcile your amendment.
                </p>
              )}
              {isMissing && (
                <p>
                  This trade is no longer available. Close this form and review
                  the refreshed trade list.
                </p>
              )}
            </div>
          )}

          {hasConflict && trade && (
            <div className="conflict-recovery">
              <button
                type="button"
                className="btn btn-outline"
                disabled={submitting}
                onClick={() => void reloadLatest()}
              >
                {loadingLatest
                  ? "Loading latest version..."
                  : "Reload latest version"}
              </button>
              {reloadError && (
                <p role="alert" className="form-error">
                  {reloadError}
                </p>
              )}
              {latest && draft && (
                <TradeConflictPanel
                  key={`${latest.id}:${latest.version}`}
                  original={trade}
                  latest={latest}
                  draft={draft}
                  onApply={(merged) => {
                    reset(getFormValues(latest));
                    reset(merged, { keepDefaultValues: true });
                    onReconcile(latest);
                    setLatest(null);
                    setDraft(null);
                  }}
                />
              )}
            </div>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Discard
            </button>

            <button
              className="btn btn-primary"
              disabled={submitting || submissionBlocked}
              type="submit"
            >
              {submitting && <LoaderCircle className="spin" size={16} />}

              {submitting
                ? trade
                  ? "Saving amendment..."
                  : "Creating trade..."
                : trade
                  ? "Save amendment"
                  : "Create trade"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
