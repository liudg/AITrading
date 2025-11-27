-- CreateTable
CREATE TABLE "models" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "apiConfig" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelId" TEXT NOT NULL,
    "cash" REAL NOT NULL DEFAULT 100000,
    "totalValue" REAL NOT NULL DEFAULT 100000,
    "initialValue" REAL NOT NULL DEFAULT 100000,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "portfolios_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "portfolio_snapshots" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "totalValue" REAL NOT NULL,
    "cash" REAL NOT NULL,
    "positionValue" REAL NOT NULL,
    "returnPct" REAL NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "portfolio_snapshots_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "portfolioId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "avgPrice" REAL NOT NULL,
    "currentPrice" REAL NOT NULL,
    "marketValue" REAL NOT NULL,
    "unrealizedPnL" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "positions_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trades" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modelId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "amount" REAL NOT NULL,
    "rationale" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "executedAt" DATETIME,
    "closedAt" DATETIME,
    "pnl" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "trades_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reflections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradeId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pnl" REAL NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reflections_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "trades" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reflections_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stock_pools" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "symbols" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL DEFAULT 'USER',
    "reason" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "market_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "open" REAL NOT NULL,
    "high" REAL NOT NULL,
    "low" REAL NOT NULL,
    "close" REAL NOT NULL,
    "volume" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "news_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "url" TEXT,
    "publishedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "daily_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "day" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "overallInsight" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "report_model_performances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "totalValue" REAL NOT NULL,
    "returnAmount" REAL NOT NULL,
    "returnPct" REAL NOT NULL,
    "dailyReturn" REAL,
    "dailyReturnPct" REAL,
    "cashRatio" REAL NOT NULL DEFAULT 0,
    "positionRatio" REAL NOT NULL DEFAULT 0,
    "rankChange" INTEGER,
    "positionsCount" INTEGER NOT NULL,
    "positionsDetail" TEXT,
    "tradesCount" INTEGER NOT NULL,
    "buyCount" INTEGER NOT NULL DEFAULT 0,
    "sellCount" INTEGER NOT NULL DEFAULT 0,
    "winRate" REAL,
    "bestTrade" TEXT,
    "worstTrade" TEXT,
    "todayTrades" TEXT,
    "strategyAnalysis" TEXT,
    "keyInsights" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "report_model_performances_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "daily_reports" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "report_model_performances_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "report_stock_distributions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "holdingAICount" INTEGER NOT NULL,
    "totalShares" INTEGER NOT NULL,
    "totalValue" REAL NOT NULL,
    "totalPnL" REAL NOT NULL,
    "holders" TEXT NOT NULL,
    "changes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "report_stock_distributions_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "daily_reports" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "models_name_key" ON "models"("name");

-- CreateIndex
CREATE UNIQUE INDEX "portfolios_modelId_key" ON "portfolios"("modelId");

-- CreateIndex
CREATE INDEX "portfolio_snapshots_portfolioId_timestamp_idx" ON "portfolio_snapshots"("portfolioId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "positions_portfolioId_symbol_key" ON "positions"("portfolioId", "symbol");

-- CreateIndex
CREATE INDEX "trades_modelId_status_idx" ON "trades"("modelId", "status");

-- CreateIndex
CREATE INDEX "trades_symbol_idx" ON "trades"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "reflections_tradeId_key" ON "reflections"("tradeId");

-- CreateIndex
CREATE INDEX "reflections_modelId_score_idx" ON "reflections"("modelId", "score");

-- CreateIndex
CREATE INDEX "market_data_symbol_idx" ON "market_data"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "market_data_symbol_date_key" ON "market_data"("symbol", "date");

-- CreateIndex
CREATE INDEX "news_data_symbol_publishedAt_idx" ON "news_data"("symbol", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- CreateIndex
CREATE UNIQUE INDEX "daily_reports_day_key" ON "daily_reports"("day");

-- CreateIndex
CREATE INDEX "daily_reports_date_idx" ON "daily_reports"("date");

-- CreateIndex
CREATE INDEX "report_model_performances_modelId_idx" ON "report_model_performances"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "report_model_performances_reportId_modelId_key" ON "report_model_performances"("reportId", "modelId");

-- CreateIndex
CREATE INDEX "report_stock_distributions_symbol_idx" ON "report_stock_distributions"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "report_stock_distributions_reportId_symbol_key" ON "report_stock_distributions"("reportId", "symbol");
