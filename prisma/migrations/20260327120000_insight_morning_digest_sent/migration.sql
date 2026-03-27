-- AlterTable
ALTER TABLE "Insight" ADD COLUMN "morningDigestSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Insight_userId_style_morningDigestSentAt_idx" ON "Insight"("userId", "style", "morningDigestSentAt");
