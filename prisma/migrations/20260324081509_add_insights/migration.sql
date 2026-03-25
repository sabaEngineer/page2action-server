-- CreateEnum
CREATE TYPE "DetailType" AS ENUM ('EXAMPLE', 'STORY', 'NOTE');

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsightDetail" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "DetailType" NOT NULL DEFAULT 'NOTE',
    "insightId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsightDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Insight_bookId_idx" ON "Insight"("bookId");

-- CreateIndex
CREATE INDEX "Insight_userId_idx" ON "Insight"("userId");

-- CreateIndex
CREATE INDEX "InsightDetail_insightId_idx" ON "InsightDetail"("insightId");

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsightDetail" ADD CONSTRAINT "InsightDetail_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "Insight"("id") ON DELETE CASCADE ON UPDATE CASCADE;
