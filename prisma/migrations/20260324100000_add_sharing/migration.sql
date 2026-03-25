-- AlterTable User: add shareSlug and allPublic
ALTER TABLE "User" ADD COLUMN "shareSlug" TEXT;
ALTER TABLE "User" ADD COLUMN "allPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "User_shareSlug_key" ON "User"("shareSlug");

-- AlterTable Shelf: add isPublic and shareSlug
ALTER TABLE "Shelf" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Shelf" ADD COLUMN "shareSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Shelf_shareSlug_key" ON "Shelf"("shareSlug");
