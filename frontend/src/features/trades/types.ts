export type Side = "BUY" | "SELL";
export type TradeStatus = "ACTIVE" | "CANCELLED";
export type Trade = {
  id: string;
  tradeId: string;
  symbol: string;
  side: Side;
  quantity: number;
  price: number;
  trader: string;
  book: string;
  counterparty: string;
  tradeDate: string;
  status: TradeStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
};
export type TradeInput = Pick<
  Trade,
  "symbol" | "side" | "quantity" | "price" | "trader" | "book" | "counterparty"
>;
export type TradeList = {
  data: Trade[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};
export type Position = {
  symbol: string;
  netQuantity: number;
  grossQuantity: number;
};
export type Summary = {
  activeCount: number;
  cancelledCount: number;
  totalCount: number;
  positions: Position[];
};
export type Audit = {
  id: string;
  tradeId: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  createdAt: string;
};
export type TradeFilters = {
  search: string;
  side: string;
  status: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: string;
};
