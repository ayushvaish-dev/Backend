// cron/notificationCleanup.js
const cron = require("node-cron");
const prisma = require('../../config/prismaClient');
cron.schedule("0 0 * * *", async () => {
  try {
    // Cutoff = 10 days ago
    const cutoff = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    const deleted = await prisma.notifications.deleteMany({
      where: {
        created_at: { lt: cutoff },
      },
    });

    if (deleted.count > 0) {
      console.log(`Deleted ${deleted.count} notifications older than 10 days`);
    }
  } catch (err) {
    console.error("Error deleting notifications:", err);
  }
});