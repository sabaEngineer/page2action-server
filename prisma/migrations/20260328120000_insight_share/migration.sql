-- AlterTable
ALTER TABLE "User" ADD COLUMN "profileSlug" TEXT;

-- AlterTable
ALTER TABLE "Book" ADD COLUMN "publicSlug" TEXT;

-- AlterTable
ALTER TABLE "Insight" ADD COLUMN "isShared" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "shareSlug" TEXT;

CREATE UNIQUE INDEX "User_profileSlug_key" ON "User"("profileSlug");

CREATE UNIQUE INDEX "Insight_shareSlug_key" ON "Insight"("shareSlug");

CREATE UNIQUE INDEX "Book_userId_publicSlug_key" ON "Book"("userId", "publicSlug");
