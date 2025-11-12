// controllers/payment.controller.js
const Stripe = require("stripe");
const paymentDao = require("../../dao/payment/paymentDao");
const orderDao = require("../../dao/payment/orderDao");
const { OrderStatus } = require("@prisma/client");
const {errorResponse} = require('../../utils/apiResponse');
const messages = require("../../utils/messages");


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

 // Create checkout session
 async function createCreditsCheckoutSession(req, res) {
  try {
    const { userId, credits } = req.body;

    if (!userId || !credits) {
   return errorResponse(req, res, 400, messages.USER_ID_OR_CREDITS_MISSING);
    }

    const creditPrice = 100; // $1 per credit (in cents)
    const totalAmount = creditPrice * credits;

    //  pending order 
    const order = await orderDao.createOrder({
      user_id: userId,
      type: "CREDIT_PURCHASE",
      total_amount: totalAmount / 100, // store in dollars
      credits_added: credits,
      status: OrderStatus.PENDING,
    });

    //  checkout session with metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Purchase ${credits} credits` },
            unit_amount: creditPrice * credits,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
      metadata: { userId, credits, orderId: order.id },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe Error (credits):", err);
    return errorResponse(req, res, 500, messages.STRIPE_NOT_CREATING_CHECKOUT);
  }
}

//subscription checkout
  async function createSubscriptionCheckoutSession(req, res) {
  try {
    const { userId } = req.body;

    if (!userId) {
    return errorResponse(req, res, 400, messages.USER_ID_REQUIRED);
    }

    const planType = "MONTHLY";
    const totalAmount = 6900 / 100; // $69

    // Creating pending order 

    const order = await orderDao.createOrder({
      user_id: userId,
      type: "MEMBERSHIP",
      total_amount: totalAmount,
      status: OrderStatus.PENDING,
    });

    //  Create checkout session with metadata
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            recurring: { interval: "month" },
            product_data: { name: "Monthly Subscription" },
            unit_amount: 6900, 
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription-cancel`,
      metadata: { userId, planType, orderId: order.id },
    });

    res.json({ url: session.url });
   } catch (err) {
    console.error("Stripe Error (subscription):", err);
   return errorResponse(req, res, 500, messages.STRIPE_NOT_CREATING_CHECKOUT);
  }
}

//webhook
  async function handleStripeWebhook(req, res) {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return errorResponse(req, res, 400, messages.FAILED_TO_VERIFY);
  }

  try {
    switch (event.type) {
      //  Checkout session finished 
      case "checkout.session.completed": {
        const session = event.data.object;
        const { userId, credits, planType, orderId } = session.metadata;

        if (session.mode === "payment" && credits) {
          // CREDIT PURCHASE
          await orderDao.updateOrderStatus(orderId, "COMPLETED");
          await paymentDao.recordCreditPurchase({
            userId,
            credits: parseInt(credits, 10),
            amount: session.amount_total / 100,
            stripeSessionId: session.id,
            paymentId: session.payment_intent,
          });
        }

        if (session.mode === "subscription" && planType) {
          // SUBSCRIPTION START
          await orderDao.completeOrderAndHandleSubscription(orderId, planType,session.subscription);
         
        }
        break;
      }
  
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        // Find subscription
         if (invoice.billing_reason === "subscription_create") {
    
  } else {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);        
        await orderDao.createOrder({
          user_id: sub.metadata.userId,
          type: "SUBSCRIPTION",
          total_amount: invoice.amount_paid / 100,
          status: "COMPLETED",
        });
             
        await paymentDao.updateSubscriptionBilling(subscriptionId, invoice.period_end);
      }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        await paymentDao.markSubscriptionPastDue(invoice.subscription);
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        if (pi.metadata?.orderId) {
          await orderDao.updateOrderStatus(pi.metadata.orderId, "FAILED");
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await paymentDao.cancelSubscription(subscription.id);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook handling error:", err);
    return errorResponse(req, res, 500, messages.WEBHOOK_HANDLER_FAILED);
  }
}


module.exports = {
  createCreditsCheckoutSession,
  createSubscriptionCheckoutSession,
  handleStripeWebhook,
};