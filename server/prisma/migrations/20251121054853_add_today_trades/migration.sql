/*
  Warnings:

  - You are about to drop the column `todayBestTrade` on the `report_model_performances` table. All the data in the column will be lost.
  - You are about to drop the column `todayWorstTrade` on the `report_model_performances` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_report_model_performances" (
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
INSERT INTO "new_report_model_performances" ("bestTrade", "buyCount", "cashRatio", "createdAt", "dailyReturn", "dailyReturnPct", "id", "keyInsights", "modelId", "positionRatio", "positionsCount", "positionsDetail", "rankChange", "reportId", "returnAmount", "returnPct", "sellCount", "strategyAnalysis", "totalValue", "tradesCount", "winRate", "worstTrade") SELECT "bestTrade", "buyCount", "cashRatio", "createdAt", "dailyReturn", "dailyReturnPct", "id", "keyInsights", "modelId", "positionRatio", "positionsCount", "positionsDetail", "rankChange", "reportId", "returnAmount", "returnPct", "sellCount", "strategyAnalysis", "totalValue", "tradesCount", "winRate", "worstTrade" FROM "report_model_performances";
DROP TABLE "report_model_performances";
ALTER TABLE "new_report_model_performances" RENAME TO "report_model_performances";
CREATE INDEX "report_model_performances_modelId_idx" ON "report_model_performances"("modelId");
CREATE UNIQUE INDEX "report_model_performances_reportId_modelId_key" ON "report_model_performances"("reportId", "modelId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
