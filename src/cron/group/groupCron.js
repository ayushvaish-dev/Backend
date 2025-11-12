// cron/groupMessageCleanup.js
const cron = require("node-cron");
const prisma = require("../../config/prismaClient");

// Run every day at midnight
cron.schedule("0 0 * * *", async () => {
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

    const deleted = await prisma.group_message.deleteMany({
      where: {
        timeStamp: { lt: cutoff },
        is_pinned: false // Don't delete pinned messages
      },
    });

    if (deleted.count > 0) {
      console.log(`Deleted ${deleted.count} group messages older than 7 days`);
    }
  } catch (err) {
    console.error("Error deleting group messages:", err);
  }
});