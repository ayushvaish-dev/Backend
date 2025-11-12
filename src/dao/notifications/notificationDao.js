const prisma = require('../../config/prismaClient');

async function createNotification({ userId, type, title, message, relatedId = null, relatedType = null }) {
  return prisma.notifications.create({
    data: {
      user_id: userId,
      type,
      title,
      message,
      related_id: relatedId,
      related_type: relatedType,
    },
  });
}

async function getUserNotifications(userId) {
  return prisma.notifications.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });
}

async function markNotificationRead(notificationId) {
  return prisma.notifications.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationRead,
};