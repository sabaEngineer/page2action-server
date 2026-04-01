DELETE FROM "UserNotificationLastSend" WHERE style = 'TODAYS_TAKEAWAY'::"InsightStyle";
DELETE FROM "UserNotificationSchedule" WHERE style = 'TODAYS_TAKEAWAY'::"InsightStyle";
