const orderDao = require('../../dao/payment/orderDao');
const messages = require('../../utils/messages');
const {successResponse,errorResponse} = require('../../utils/apiResponse');
const { OrderStatus, OrderType } = require('@prisma/client');


const orderController = {

  async subscribeMembership(req, res) {

    try {
      const { userId } = req.params;
      const { plan_type, total_amount,type}=req.body;

      const orderData = {
        user_id: userId,
        type,
        total_amount,
        status: "COMPLETED"
      };

      const subscriptionData = { plan_type };

      const result = await orderDao.createSubscription(userId, orderData, subscriptionData);
     return successResponse(req, res, result, 200, messages.SUBSCRIPTION_ADDED);

      } catch (err) {
     return errorResponse(req, res, 500, err.message);
      }
  },
  // create order with pending status
  async  createOrder(req, res) {
    try {
    const { userId } = req.params;
    const { total_amount, type } = req.body;

    const orderData = {
      user_id: userId,
      type,
      total_amount,
      status: "PENDING", // initially pending
    };

    const order = await orderDao.createOrder(orderData);
    return successResponse(req, res, order, 200, messages.PENDING_ORDER_CREATED);
    } catch (err) {
    return errorResponse(req, res, 500, err.message);
    }
  },
  async subscriptioncheck(req, res) {
    try {
    const { orderId, status, plan_type } = req.body;

    if (status === "COMPLETED") {
      const result = await orderDao.completeOrderAndHandleSubscription(orderId, plan_type);
      return successResponse(req, res, result, 200, messages.HANDLED_SUBSCRIPTION);
    }

    await orderDao.updateOrderStatus(orderId, status);
    return successResponse(req, res, {}, 200, `Order updated to ${status}`);
    } catch (err) {
    return errorResponse(req, res, 500, err.message);
    }
  },
  async cancelMembership(req, res) {
    try {
      const { userId } = req.params; 
      const result = await orderDao.cancelSubscription(userId);
      return successResponse(req, res, result, 200, messages.CANCELLED_USER_SUBSCRIPTION);
    } catch (err) {
      return errorResponse(req, res, 500, err.message);
    }
  },

  async getMembershipStatus(req, res) {
    try {
      const { userId } = req.params;
      const result = await orderDao.getSubscriptionStatus(userId);
      return successResponse(req, res, result, 200,messages.FETCHED_UPDATED_SUBS_STATUS );
    } catch (err) {
      return errorResponse(req, res, 500, err.message);
    }
  },

  async purchaseCredits(req, res) {
    try {
      const { userId } = req.params;
      const { total_amount, credits } = req.body;

      const orderData = {
        user_id: userId,
        type: OrderType.CREDIT_PURCHASE,
        total_amount,
        credits_added: credits,
        status: OrderStatus.COMPLETED
      };

      const order = await orderDao.purchaseCredits(userId, orderData, credits);
      return successResponse(req, res, order, 200, messages.ADDED_CREDITS_SUCCESSFULLY);
    } catch (err) {
     return errorResponse(req, res, 500, err.message);
    }
  },

  async getCreditsBalance(req, res) {
    try {
      const { userId } = req.params;
      const balance = await orderDao.getCreditsBalance(userId);
      return successResponse(req, res, { balance }, 200, "success");
    } catch (err) {
      return errorResponse(req, res, 500, err.message);
    }
  },

  async getCreditsHistory(req, res) {
    try {
      const { userId } = req.params;
      const history = await orderDao.getCreditsHistory(userId);
      return successResponse(req, res, history, 200, messages.FETCHED_CREDIT_HISTORY_SUCCESSFULLY);
    } catch (err) {
      return errorResponse(req, res, 500, err.message);
    }
  },

  async getCreditsUsages(req, res) {
    try {
      const { userId } = req.params;
      const usages = await orderDao.getCreditsUsages(userId);
return successResponse(req, res, usages, 200, messages.FETCHED_CREDIT_USAGE_DETAILS);
    } catch (err) {
      return errorResponse(req, res, 500, err.message);
    }
  },

  async getOrders(req, res) {
    try {
      const { userId } = req.params;
      const orders = await orderDao.getOrders(userId);
return successResponse(req, res, orders, 200, messages.FETCHED_ORDERS_SUCCESSFULLY);
    } catch (err) {
     return errorResponse(req, res, 500, err.message);
    }
  },

  async getPaymentDetails(req, res) {
    try {
      const { orderId } = req.params;
      const payments = await orderDao.getPaymentDetails(orderId);
      return successResponse(req, res, payments, 200, messages.FETCHED_PAYMENTS_SUCCESSFULLY);
    } catch (err) {
     return errorResponse(req, res, 500, err.message);
    }
  },

  async  unlockContent(req, res) {
    try {
    const { userId, credits_spent, unlock_type, unlock_id } = req.body;
     const userBalance = await orderDao.getUserBalance(userId); 

    if (userBalance < credits_spent) {
      return errorResponse(req, res, 400, "Insufficient credits to unlock this content");
    }

    const usageData = { credits_spent, unlock_type, unlock_id };
    const usage = await orderDao.unlockContent(userId, usageData);

    let accessResult;

    if (unlock_type === "LESSON") {
      accessResult = await orderDao.grantLessonAccess(userId, unlock_id);
    } else if (unlock_type === "COURSE") {
      accessResult = await orderDao.grantCourseAccess(userId, unlock_id);
    } else if (unlock_type === "CATALOG") {
      accessResult = await orderDao.grantCatalogAccess(userId, unlock_id);
    }

    await orderDao.deductCredits(userId, credits_spent);
   return successResponse(
  req,
  res,
  { usage, access: accessResult },
  200,
  messages.UNLOCKED_SUCCESSFULLY
  );

    } catch (err) {
    console.error("unlockContent error:", err);
    return errorResponse(req, res, 500, err.message);
    }
  },

  async getUnlockHistory(req, res) {
    try {
      const { userId } = req.body; 
      const history = await orderDao.getUnlockHistory(userId);
      return successResponse(req, res, history, 200, messages.FETCHED_HISTORY_SUCCESSFULLY);
    } catch (err) {
      return errorResponse(req, res, 500, err.message);
    }
  },

  async adminOrders(req, res) {
    try {
      const orders = await orderDao.getAllOrders();
      return successResponse(req, res, orders, 200,messages.FETCHED_ORDERS_SUCCESSFULLY );
    } catch (err) {
     return errorResponse(req, res, 500, err.message);
    }
  },

  async adminPayments(req, res) {
    try {
      const payments = await orderDao.getAllPayments();
      return successResponse(req, res, payments, 200, messages.FETCHED_PAYMENTS_SUCCESSFULLY);
    } catch (err) {
      return errorResponse(req, res, 500, err.message);
    }
  },

  async adminSubscriptions(req, res) {
    try {
      const subs = await orderDao.getAllSubscriptions();
     return successResponse(req, res, subs, 200, messages.FETCHED_SUBSCRIPTION_SUCCESSFULLY);
    } catch (err) {
     return errorResponse(req, res, 500, err.message);
    }
  },

  async adminCredits(req, res) {
    try {
      const credits = await orderDao.getAllCredits();
      return successResponse(req, res, credits, 200,messages.CREDITS_FETCHED_SUCCESSFULLY);
    } catch (err) {
     return errorResponse(req, res, 500, err.message);
    }
  },

  async grantFreeCredits(req, res) {
    try {
    const { userIds, credits } = req.body; 
    const result = await orderDao.grantFreeCredits(userIds, credits);
     return successResponse(req, res, result, 200, messages.GRANTED_FREE_CREDITS);

   } catch (err) {
     return errorResponse(req, res, 500, err.message);
   }
   },
   async createCreditPricing (req,res) {
  try {
    const { unlock_type, service_key, credits } = req.body;

    if (!unlock_type || !service_key || !credits) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: unlock_type, service_key, credits"
      });
    }

    const pricing = await orderDao.createCreditPricing({
      unlock_type,
      service_key,
      credits
    });

    res.status(201).json({ success: true, message: messages.CREDIT_PRICING_CREATED, data: pricing });
  } catch (err) {
    res.status(500).json({ success: false, message: messages.ERROR_CREATING_CREDIT_PRICING, error: err.message });
  }
},

// GET -> fetch all
async getAllCreditPricing  (req, res){
  try {
    const pricings = await orderDao.getAllCreditPricing();
    res.status(200).json({ success: true, data: pricings });
  } catch (err) {
    res.status(500).json({ success: false, message: messages.ERROR_FETCHING_CREDIT_PRICING, error: err.message });
  }
},

// PATCH -> update a specific pricing record
async updateCreditPricing(req, res) {
  try {
    const { id } = req.params;
    const { credits } = req.body;

    if (!credits) {
      return res.status(400).json({
        success: false,
        message: "Credits value is required"
      });
    }

    const updated = await orderDao.updateCreditPricing(id, { credits });
    res.status(200).json({ success: true, message: messages.CREDIT_PRICING_UPDATED, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: messages.ERROR_UPDATING_CREDIT_PRICING, error: err.message });
  }
},
  
async deductCredits (req, res){
  try {
    const { userId, credits } = req.body;

    if (!userId || !credits) {
      return errorResponse(req, res, 400, "userId and credits are required");
    }

    // Check balance
    const balance = await orderDao.getUserBalance(userId);
    if (balance < credits) {
      return errorResponse(req, res, 400, "Insufficient credits");
    }

    // Deduct credits
    const updatedUser = await orderDao.deductCredits(userId, credits);

    return successResponse(
      req,
      res,
      {
        userId,
        deducted: credits,
        remaining_credits: updatedUser.total_credits
      },
      200,
      "Credits deducted successfully"
    );
  } catch (err) {
    console.error("deductCredits error:", err);
    return errorResponse(req, res, 500, err.message);
  }
}
};



module.exports = orderController;
