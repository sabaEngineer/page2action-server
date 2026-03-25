-- CreateEnum
CREATE TYPE "InsightStyle" AS ENUM ('MORNING_BOOST', 'APPLY_TODAY', 'DO_IT_NOW', 'SPREAD_THE_IDEA', 'TODAYS_TAKEAWAY');

-- AlterTable
ALTER TABLE "Insight" ADD COLUMN     "style" "InsightStyle";
