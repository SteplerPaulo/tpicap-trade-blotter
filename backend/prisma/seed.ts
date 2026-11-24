import { PrismaClient, TradeSide, TradeStatus } from "@prisma/client";

const db = new PrismaClient();
const symbols = [
  "AAPL",
  "MSFT",
  "TSLA",
  "NVDA",
  "AMZN",
  "GOOGL",
  "META",
  "JPM",
  "BAC",
  "IBM",
  "ORCL",
  "AMD",
  "V",
  "MA",
  "NFLX",
];
const traders = ["JSMITH", "ABROWN", "MJONES", "SKIM", "RLEE", "PCHEN"];
const books = [
  "EQUITIES_US",
  "EQUITIES_UK",
  "TECH_GROWTH",
  "CORE_ALPHA",
  "MARKET_MAKING",
];
const counterparties = [
  "Goldman Sachs",
  "JP Morgan",
  "Morgan Stanley",
  "Citi",
  "Barclays",
  "UBS",
];
// Deterministic, local-only synthetic fixture data. Re-running the seed is safe.
let s = 20261122;
function rand() {
  s = (1664525 * s + 1013904223) >>> 0;
  return s / 4294967296;
}
function sample<T>(xs: T[]): T {
  return xs[Math.floor(rand() * xs.length)];
}
async function main() {
  if ((await db.trade.count()) > 0) {
    console.log("Existing trades found; skipping seed.");
    return;
  }
  const now = new Date();
  const rows = Array.from({ length: 350 }, (_, i) => {
    const date = new Date(
      now.getTime() - Math.floor(rand() * 7 * 24 * 60 * 60 * 1000),
    );
    return {
      tradeId: `TRD-${String(i + 100001)}`,
      symbol: sample(symbols),
      side: sample([TradeSide.BUY, TradeSide.SELL]),
      quantity: (Math.floor(rand() * 100) + 1) * 100,
      price: (20 + rand() * 600).toFixed(4),
      trader: sample(traders),
      book: sample(books),
      counterparty: sample(counterparties),
      tradeDate: date,
      status: rand() < 0.07 ? TradeStatus.CANCELLED : TradeStatus.ACTIVE,
    };
  });
  await db.trade.createMany({ data: rows });
  console.log(`Seeded ${rows.length} synthetic trades.`);
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
