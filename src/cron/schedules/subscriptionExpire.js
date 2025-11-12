const prisma = require('../../config/prismaClient');

const expireSubscriptions = async () => {
  try {
    const result = await prisma.user_course_access.updateMany({
      where: {
        subscription_end: { lt: new Date() },
        status: 'ACTIVE',
      },
      data: {
        status: 'EXPIRED',
      },
    });

    console.log(`Marked ${result.count} subscriptions as EXPIRED at ${new Date().toISOString()}`);
  } catch (err) {
    console.error("Error expiring subscriptions:", err);
  } finally {
    await prisma.$disconnect();
  }
};


module.exports = expireSubscriptions;
