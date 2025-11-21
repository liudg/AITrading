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
    "positionsCount" INTEGER NOT NULL,
    "positionsDetail" TEXT,
    "tradesCount" INTEGER NOT NULL,
    "buyCount" INTEGER NOT NULL DEFAULT 0,
    "sellCount" INTEGER NOT NULL DEFAULT 0,
    "winRate" REAL,
    "bestTrade" TEXT,
    "worstTrade" TEXT,
    "strategyAnalysis" TEXT,
    "keyInsights" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "report_model_performances_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "daily_reports" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "report_model_performances_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_reports_day_key" ON "daily_reports"("day");

-- CreateIndex
CREATE INDEX "daily_reports_date_idx" ON "daily_reports"("date");

-- CreateIndex
CREATE INDEX "report_model_performances_modelId_idx" ON "report_model_performances"("modelId");

-- CreateIndex
CREATE UNIQUE INDEX "report_model_performances_reportId_modelId_key" ON "report_model_performances"("reportId", "modelId");
