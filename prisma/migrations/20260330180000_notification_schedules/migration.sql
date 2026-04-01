-- Delivery time zone (synced from device in app; not shown in schedule UI)
ALTER TABLE "User" ADD COLUMN "deliveryTimeZone" TEXT NOT NULL DEFAULT 'UTC';
UPDATE "User" SET "deliveryTimeZone" = "morningBoostTimeZone";

CREATE TABLE "UserNotificationSchedule" (
    "userId" TEXT NOT NULL,
    "style" "InsightStyle" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "localHour" INTEGER NOT NULL,
    "localMinute" INTEGER NOT NULL,

    CONSTRAINT "UserNotificationSchedule_pkey" PRIMARY KEY ("userId","style")
);

CREATE TABLE "UserNotificationLastSend" (
    "userId" TEXT NOT NULL,
    "style" "InsightStyle" NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationLastSend_pkey" PRIMARY KEY ("userId","style")
);

ALTER TABLE "UserNotificationSchedule" ADD CONSTRAINT "UserNotificationSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserNotificationLastSend" ADD CONSTRAINT "UserNotificationLastSend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "UserNotificationSchedule" ("userId", style, enabled, "localHour", "localMinute")
SELECT id, 'MORNING_BOOST'::"InsightStyle", "morningBoostEmailEnabled", "morningBoostLocalHour", "morningBoostLocalMinute"
FROM "User";

INSERT INTO "UserNotificationSchedule" ("userId", style, enabled, "localHour", "localMinute")
SELECT u.id, v.style, false, v.hh, v.mm
FROM "User" u
CROSS JOIN (VALUES
    ('APPLY_TODAY'::"InsightStyle", 9, 0),
    ('DO_IT_NOW'::"InsightStyle", 12, 0),
    ('SPREAD_THE_IDEA'::"InsightStyle", 15, 0),
    ('TODAYS_TAKEAWAY'::"InsightStyle", 19, 0)
) AS v(style, hh, mm)
WHERE NOT EXISTS (
    SELECT 1 FROM "UserNotificationSchedule" s WHERE s."userId" = u.id AND s.style = v.style
);

INSERT INTO "UserNotificationLastSend" ("userId", style, "lastSentAt")
SELECT id, 'MORNING_BOOST'::"InsightStyle", "morningBoostLastDigestAt"
FROM "User" WHERE "morningBoostLastDigestAt" IS NOT NULL;

ALTER TABLE "User" DROP COLUMN "morningBoostEmailEnabled",
DROP COLUMN "morningBoostLocalHour",
DROP COLUMN "morningBoostLocalMinute",
DROP COLUMN "morningBoostTimeZone",
DROP COLUMN "morningBoostUseDeviceTimeZone",
DROP COLUMN "morningBoostLastDigestAt";

CREATE INDEX "UserNotificationSchedule_userId_enabled_idx" ON "UserNotificationSchedule"("userId", "enabled");
