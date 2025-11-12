const { OrderStatus } = require('@prisma/client');
const prisma = require('../../config/prismaClient');

async function recordCreditPurchase({ userId, credits, amount, stripeSessionId, paymentId }) {
  const order = await prisma.orders.create({
    data: {
      user_id: userId,
      type: "CREDIT_PURCHASE",
      total_amount: amount,
      credits_added: credits,
      status: OrderStatus.COMPLETED,
      payment_method: "stripe",
      stripe_session_id: stripeSessionId,
      payment_id: paymentId,
    },
  });

  await prisma.payments.create({
    data: {
      order_id: order.id,
      amount,
      status: "SUCCESS",
      transaction_id: paymentId,
      payment_method: "stripe",
    },
  });

  await prisma.users.update({
    where: { id: userId },
    data: { total_credits: { increment: credits } },
  });

  return order;
}

async function updateSubscriptionBilling(stripeSubscriptionId, nextBilling) {
  return prisma.subscriptions.updateMany({
    where: { stripe_subscription_id: stripeSubscriptionId },
    data: { next_billing: new Date(nextBilling * 1000) },
  });
}

async function markSubscriptionPastDue(stripeSubscriptionId) {
  return prisma.subscriptions.updateMany({
    where: { stripe_subscription_id: stripeSubscriptionId },
    data: { status: "PAST_DUE" },
  });
}

async function cancelSubscription(stripeSubscriptionId) {
  return prisma.subscriptions.updateMany({
    where: { stripe_subscription_id: stripeSubscriptionId },
    data: { status: "CANCELED", canceled_at: new Date() },
  });
}

module.exports = {
  recordCreditPurchase,
  updateSubscriptionBilling,
  markSubscriptionPastDue,
  cancelSubscription,
};