CREATE TYPE "TradeSide" AS ENUM ('BUY', 'SELL');

CREATE TYPE "TradeStatus" AS ENUM ('ACTIVE', 'CANCELLED');

CREATE TABLE
  "Trade" (
    "id" UUID NOT NULL,
    "tradeId" TEXT NOT NULL,
    "symbol" VARCHAR(16) NOT NULL,
    "side" "TradeSide" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(18, 4) NOT NULL,
    "trader" VARCHAR(64) NOT NULL,
    "book" VARCHAR(64) NOT NULL,
    "counterparty" VARCHAR(100) NOT NULL,
    "tradeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "TradeStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE
  "TradeAudit" (
    "id" UUID NOT NULL,
    "tradeId" UUID NOT NULL,
    "action" VARCHAR(16) NOT NULL,
    "before" JSONB,
    "after" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TradeAudit_pkey" PRIMARY KEY ("id")
  );

CREATE UNIQUE INDEX "Trade_tradeId_key" ON "Trade" ("tradeId");

CREATE INDEX "Trade_tradeDate_idx" ON "Trade" ("tradeDate" DESC);

CREATE INDEX "Trade_symbol_status_idx" ON "Trade" ("symbol", "status");

CREATE INDEX "TradeAudit_tradeId_createdAt_idx" ON "TradeAudit" ("tradeId", "createdAt" DESC);

ALTER TABLE "TradeAudit" ADD CONSTRAINT "TradeAudit_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade" ("id") ON DELETE CASCADE ON UPDATE CASCADE;