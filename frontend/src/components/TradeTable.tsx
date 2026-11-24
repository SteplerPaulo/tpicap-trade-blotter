import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  History,
  Ban,
} from "lucide-react";
import type { Trade, TradeFilters } from "../features/trades/types";

import { formatPrice, formatNotional } from "../features/trades/money";

const number = new Intl.NumberFormat("en-US");
type Props = {
  trades: Trade[];
  filters: TradeFilters;
  setFilters: React.Dispatch<React.SetStateAction<TradeFilters>>;
  onEdit: (t: Trade) => void;
  onCancel: (t: Trade) => void;
  onAudit: (t: Trade) => void;
};
export function TradeTable({
  trades,
  filters,
  setFilters,
  onEdit,
  onCancel,
  onAudit,
}: Props) {
  const columns = useMemo<ColumnDef<Trade>[]>(
    () => [
      {
        accessorKey: "tradeId",
        header: "TRADE ID",
        cell: (ctx) => (
          <span className="trade-id">{ctx.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "tradeDate",
        header: "EXECUTED AT",
        cell: (ctx) => (
          <span className="date-value">
            {new Date(ctx.getValue<string>()).toLocaleString("en-US", {
              month: "short",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </span>
        ),
      },
      {
        accessorKey: "symbol",
        header: "SYMBOL",
        cell: (ctx) => (
          <strong className="symbol">{ctx.getValue<string>()}</strong>
        ),
      },
      {
        accessorKey: "side",
        header: "SIDE",
        cell: (ctx) => (
          <span
            className={`pill ${ctx.getValue<string>() === "BUY" ? "buy" : "sell"}`}
          >
            {ctx.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "quantity",
        header: "QUANTITY",
        cell: (ctx) => (
          <span className="numeric">
            {number.format(ctx.getValue<number>())}
          </span>
        ),
      },
      {
        accessorKey: "price",
        header: "PRICE (USD)",
        cell: (ctx) => (
          <span className="numeric">{formatPrice(ctx.getValue<number>())}</span>
        ),
      },
      {
        id: "notional",
        header: "NOTIONAL (USD)",
        cell: (ctx) => (
          <span className="numeric notional">
            {formatNotional(ctx.row.original.quantity, ctx.row.original.price)}
          </span>
        ),
      },
      { accessorKey: "trader", header: "TRADER" },
      {
        accessorKey: "book",
        header: "BOOK",
        cell: (ctx) => (
          <span className="muted row-book">{ctx.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "STATUS",
        cell: (ctx) => (
          <span className={`status ${ctx.getValue<string>().toLowerCase()}`}>
            <i />
            {ctx.getValue<string>()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (ctx) => (
          <div className="row-actions">
            <button
              className="icon-button"
              title="View audit history"
              aria-label={`View audit history ${ctx.row.original.tradeId}`}
              onClick={() => onAudit(ctx.row.original)}
            >
              <History size={16} />
            </button>
            {ctx.row.original.status === "ACTIVE" && (
              <>
                <button
                  className="icon-button"
                  title="Amend trade"
                  aria-label={`Amend trade ${ctx.row.original.tradeId}`}
                  onClick={() => onEdit(ctx.row.original)}
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="icon-button danger-hover"
                  title="Cancel trade"
                  aria-label={`Cancel trade ${ctx.row.original.tradeId}`}
                  onClick={() => onCancel(ctx.row.original)}
                >
                  <Ban size={16} />
                </button>
              </>
            )}
            <MoreHorizontal className="mobile-dots" size={16} />
          </div>
        ),
      },
    ],
    [onEdit, onCancel, onAudit],
  );
  const table = useReactTable({
    data: trades,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualSorting: true,
  });
  return (
    <div
      className="table-scroll"
      tabIndex={0}
      role="region"
      aria-label="Trade executions table"
    >
      <table className="trade-table" aria-label="Trade executions">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => {
                const field = header.column.id;
                const sortable = [
                  "tradeId",
                  "tradeDate",
                  "symbol",
                  "side",
                  "quantity",
                  "price",
                  "trader",
                  "book",
                  "status",
                ].includes(field);
                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-label={field === "actions" ? "Actions" : undefined}
                    aria-sort={
                      sortable && filters.sortBy === field
                        ? filters.sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {sortable ? (
                      <button
                        className="sort-button"
                        onClick={() =>
                          setFilters((p) => ({
                            ...p,
                            page: 1,
                            sortBy: field,
                            sortDir:
                              p.sortBy === field && p.sortDir === "asc"
                                ? "desc"
                                : "asc",
                          }))
                        }
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {filters.sortBy === field ? (
                          filters.sortDir === "asc" ? (
                            <ArrowUp size={13} />
                          ) : (
                            <ArrowDown size={13} />
                          )
                        ) : (
                          <ArrowUpDown size={12} className="sort-muted" />
                        )}
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {trades.length === 0 && (
        <div className="empty-state">
          <strong>No matching trades</strong>
          <p>Try adjusting your filters or create a new trade.</p>
        </div>
      )}
    </div>
  );
}
