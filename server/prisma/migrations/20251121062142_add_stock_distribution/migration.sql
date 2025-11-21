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
CREATE INDEX "report_stock_distributions_symbol_idx" ON "report_stock_distributions"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "report_stock_distributions_reportId_symbol_key" ON "report_stock_distributions"("reportId", "symbol");
