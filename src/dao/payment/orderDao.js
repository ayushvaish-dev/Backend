const { SubscriptionStatus, OrderType } = require('@prisma/client');
const prisma = require('../../config/prismaClient');

async function createOrder(orderData) {
  return prisma.orders.create({ data: orderData });
}

async function createSubscription(userId, orderData, subscriptionData) {
 
  const order = await prisma.orders.create({
    data: {
      user_id: userId,
      type: orderData.type,
      total_amount: orderData.total_amount,
      status: orderData.status || "COMPLETED",
    },
  });

  const existingSubscription = await prisma.subscriptions.findFirst({
    where: { user_id: userId },
  });

  let subscription;
  if (existingSubscription) {
    
    subscription = await prisma.subscriptions.update({
      where: { id: existingSubscription.id },
      data: {
        order_id: order.id,
        plan_type: subscriptionData.plan_type,
        status: "ACTIVE",
      },
    });
  } else {
    // Create a new subscription
    subscription = await prisma.subscriptions.create({
      data: {
        user_id: userId,
        order_id: order.id,
        plan_type: subscriptionData.plan_type,
        status: "ACTIVE",
      },
    });
  }

  return { order, subscription };
}

async function updateOrderStatus(orderId, status) {
  return prisma.orders.update({
    where: { id: orderId },
    data: { status }
  });
}

// On webhook success mark order complete + create subscription
async function completeOrderAndHandleSubscription(orderId, plan_type,stripeSubscriptionId) {

  const order = await prisma.orders.update({
    where: { id: orderId },
    data: { status: "COMPLETED" }
  });

  //  Check if user already has a subscription
  const existingSub = await prisma.subscriptions.findFirst({
    where: { user_id: order.user_id }
  });

  let subscription;

  if (existingSub) {
    // User already subscribed → update existing
    subscription = await prisma.subscriptions.update({
      where: { id: existingSub.id },
      data: {
        status: "ACTIVE",
        plan_type,
        order_id: order.id,
        stripe_subscription_id:stripeSubscriptionId,
        canceled_at: null 
      }
    });
  } else {
    
    subscription = await prisma.subscriptions.create({
      data: {
        user_id: order.user_id,
        order_id: order.id,
        plan_type,
        status: "ACTIVE",
        stripe_subscription_id,
      }
    });
  }

  return { order, subscription };
}

async function cancelSubscription(userId) {
  return prisma.subscriptions.updateMany({
    where: { user_id: userId, status:SubscriptionStatus.ACTIVE},
    data: { status: SubscriptionStatus.CANCELED,canceled_at: new Date() }
  });
}

async function getSubscriptionStatus(userId) {
  return prisma.subscriptions.findFirst({
   where: { user_id: userId },
   
    select: {
      id: true,
      user_id: true,
      status: true,        
      canceled_at: true,
     
    },
  });
}

async function purchaseCredits(userId, orderData, credits) {
  const order = await prisma.orders.create({ data: orderData });
  await prisma.users.update({
    where: { id: userId },
    data: { total_credits: { increment: credits } }
  });
  return order;
}

async function getCreditsBalance(userId) {
  const user = await prisma.users.findUnique({ where: { id: userId } });
  return user?.total_credits || 0;
}

async function getCreditsHistory(userId) {
  return prisma.orders.findMany({
    where: { user_id: userId, type: OrderType.CREDIT_PURCHASE },
    orderBy: { order_date: "desc" }
  });
}

async function getCreditsUsages(userId) {
  return prisma.credit_usages.findMany({
    where: { user_id: userId },
    orderBy: { used_at: "desc" }
  });
}


async function getOrders(userId) {
  return prisma.orders.findMany({
    where: { user_id: userId },
    include: { payments: true, order_items: true },
    orderBy: { order_date: "desc" }
  });
}

async function getPaymentDetails(orderId) {
  return prisma.payments.findMany({
    where: { order_id: orderId },
    orderBy: { created_at: "desc" }
  });
}

async function unlockContent(userId, usageData) {
  return prisma.credit_usages.create({
    data: { ...usageData, user_id: userId },
  });
}
async function getUserBalance(userId) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { total_credits: true },
  });
  return user?.total_credits || 0;
}
async function deductCredits(userId, credits_spent) {
  return prisma.users.update({
    where: { id: userId },
    data: {
      total_credits: {
        decrement: credits_spent,
      },
    },
  });
}

async function grantLessonAccess(userId, moduleId) {
  const module = await prisma.modules.findUnique({
    where: { id: moduleId },
    select: { id: true, course_id: true, order: true },
  });

  if (!module) throw new Error("Module not found");

  return prisma.user_module_access.upsert({
    where: { user_id_module_id: { user_id: userId, module_id: module.id } },
    update: {},
    create: {
      user_id: userId,
      course_id: module.course_id,
      module_id: module.id,
      module_order: module.order,
    },
  });
}

async function grantCourseAccess(userId, courseId) {
  
  await prisma.user_course_access.upsert({
    where: { user_id_course_id: { user_id: userId, course_id: courseId } },
    update: {},
    create: {
      user_id: userId,
      course_id: courseId,
    },
  });

  // const modules = await prisma.modules.findMany({
  //   where: { course_id: courseId },
  //   select: { id: true, order: true },
  // });

  // const moduleAccessData = modules.map((m) => ({
  //   user_id: userId,
  //   course_id: courseId,
  //   module_id: m.id,
  //   module_order: m.order,
  // }));

  // return prisma.user_module_access.createMany({
  //   data: moduleAccessData,
  //   skipDuplicates: true,
  // });
}

async function grantCatalogAccess(userId, catalogId) {
  // fetching all courses in catalog
  const catalog = await prisma.catalogs.findUnique({
    where: { id: catalogId },
    include: {
      catalog_courses: {
        select: { course_id: true },
      },
    },
  });

  if (!catalog) throw new Error("Catalog not found");

  const courseIds = catalog.catalog_courses.map((c) => c.course_id);

 
  const courseAccessData = courseIds.map((cid) => ({
    user_id: userId,
    course_id: cid,
  }));

  await prisma.user_course_access.createMany({
    data: courseAccessData,
    skipDuplicates: true,
  });

}
async function getUnlockHistory(userId) {
  const history = await prisma.credit_usages.findMany({
    where: { user_id: userId },
    orderBy: { used_at: "desc" },
  });
  //based on unlock type
  return Promise.all(
    history.map(async (h) => {
      if (h.unlock_type === "LESSON") {
        const module = await prisma.modules.findUnique({
          where: { id: h.unlock_id },
          select: { id: true, title: true, course_id: true },
        });
        return { ...h, module };
      }

      if (h.unlock_type === "COURSE") {
        const course = await prisma.courses.findUnique({
          where: { id: h.unlock_id },
          select: { id: true, title: true },
        });
        return { ...h, course };
      }

      if (h.unlock_type === "CATALOG") {
        const catalog = await prisma.catalogs.findUnique({
          where: { id: h.unlock_id },
          select: { id: true, name: true },
        });
        return { ...h, catalog };
      }

      return h;
    })
  );
}

async function getAllOrders() {
   return prisma.orders.findMany({
    orderBy: { order_date: "desc" },
    include: {
      user: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          total_credits: true,
        },
      },
    },
  });
}

async function getAllPayments() {
    return prisma.payments.findMany({
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      order_id: true,
      amount: true,
      status: true,
      payment_method: true,
      created_at: true,
      order: {
        select: {
          id: true,
          user_id: true,
          type: true,
          total_amount: true,
          credits_added: true,
          order_date: true,
          status: true,
          payment_method: true,
          payment_id: true,
          stripe_session_id: true,
          updated_at: true,
        },
      },
    },
  });

}
async function getAllSubscriptions() {
  return prisma.subscriptions.findMany({
    orderBy: { start_date: "desc" },
    include: {
      user: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          total_credits: true
        },
      },
    },
  });
}
async function getAllCredits() {
  return prisma.users.findMany({
    select: { id: true, first_name: true,last_name:true, total_credits: true }
  });
}

async function grantFreeCredits(userIds, credits) {
  return Promise.all(
    userIds.map(userId =>
      prisma.users.update({
        where: { id: userId },
        data: { total_credits: { increment:credits } },
        select:{id:true, first_name:true,last_name:true,total_credits:true}
      })
    )
  );
}
async function createCreditPricing (data) {
  return prisma.credit_pricing.create({
    data
  });
};

// Get all credit pricing entries
async function getAllCreditPricing() {
  return prisma.credit_pricing.findMany({
    orderBy: { created_at: "desc" }
  });
};

// Update credits for a pricing entry
async function updateCreditPricing (id, updates) {
  return prisma.credit_pricing.update({
    where: { id },
    data: updates
  });
};

async function getCreditsById (pricingId) {
  const pricing = await prisma.credit_pricing.findUnique({
    where: { id: pricingId },
    select: { credits: true }
  });

  return pricing ? pricing.credits : null;
};

// async function deductCredits(userId, credits)  {
//   return prisma.users.update({
//     where: { id: userId },
//     data: {
//       total_credits: {
//         decrement: credits
//       }
//     },
//     select: { id: true, total_credits: true }
//   });
// };
module.exports = {
  cancelSubscription,
  getSubscriptionStatus,
  purchaseCredits,
  getCreditsBalance,
  getCreditsHistory,
  getCreditsUsages,
  getOrders,
  getPaymentDetails,
  unlockContent,
  getUnlockHistory,
  getAllOrders,
  getAllPayments,
  getAllSubscriptions,
  getAllCredits,
  grantFreeCredits,
   createOrder,
  updateOrderStatus,
  completeOrderAndHandleSubscription,
  grantLessonAccess,
  grantCourseAccess,
  grantCatalogAccess,
  createSubscription,
  deductCredits,
 getUserBalance,
  createCreditPricing,
  getAllCreditPricing,
  updateCreditPricing,
  getCreditsById,
 };
