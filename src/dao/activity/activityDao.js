const prisma = require('../../config/prismaClient')
const activityDao = {
  logActivity: async ({ userId, action, targetId = null }) => {
    try {
      return await prisma.activity_log.create({
        data: {
          userId,
          action,
          targetId,
        },
      });
    } catch (err) {
      console.error("Error logging activity:", err);
      throw err;
    }
  },

  getActivityByUser: async (userId) => {
    return await prisma.activity_log.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  },

  deleteActivityByUser: async (userId) => {
  return await prisma.activity_log.deleteMany({
    where: { userId },
  });
},


};

module.exports = activityDao;
