const webServiceDao = require("../../dao/website_service/website_serviceDao");
const messages = require("../../utils/messages");
const orderDao = require("../../dao/payment/orderDao");
const {successResponse,errorResponse} = require('../../utils/apiResponse');

const getAllWebServices = async(req,res) => {
    try{
        const webServices = await webServiceDao.getAllWebServices();
      successResponse(req, res, webServices, 200, messages.DATA_FETCHED_SUCCESSFULLY);
    }
    catch(err){
      errorResponse(req, res, 500, messages.ERROR_FETCHING_WEB_SERVICES);
    }
};

const getWebServicesByUSer = async(req,res) =>{
    try{
    const {userId} = req.params;
    const services = await webServiceDao.getWebServicesByUSer(userId);
    successResponse(req, res, services, 200, "Data fetched successfully");
    }
    catch(err){
    errorResponse(req, res, 500, messages.ERROR_FETCHING_USER_WEB_SERVICES);
    }
};

const updateWebServiceStatus = async(req,res) =>{
    try{
    const{serviceId} = req.params;
    const{status} = req.body;
    const updated = await webServiceDao.updateWebServiceStatus(serviceId,status);
    successResponse(req, res, updated, 200, messages.WEB_SERVICE_STATUS_UPDATED);
    }
    catch(err){
    errorResponse(req, res, 500, messages.ERROR_UPDATING_WEB_SERVICE);
    }
};

const deleteWebService = async(req,res) =>{
    try{
        const {serviceId} = req.params;
        await webServiceDao.deleteWebService(serviceId);
       successResponse(req, res, null, 200, messages.WEB_SERVICE_DELETED);
    }
    catch(err){
        errorResponse(req, res, 500, messages.ERROR_DELETING_WEB_SERVICE);
    }
};
const createWebService = async (req, res) => {
  try {
    const { user_id, status,unlock_type, pricing_id } = req.body;

    if (!user_id || !status || !pricing_id) {
    return errorResponse(req, res, 400, messages.MISSING_REQUIRED_IDS);
    }
    const userBalance = await orderDao.getUserBalance(user_id); 
    const pricing = await orderDao.getCreditsById(pricing_id);
    if(userBalance<pricing){
     return errorResponse(req, res, 400, "Insufficient credits to unlock this content");
    }
    const service = await webServiceDao.createWebService({
      user_id,
      status,
      pricing_id
    });
    await orderDao.deductCredits(user_id, pricing);
     const usageData = {credits_spent: pricing, unlock_type, unlock_id : pricing_id };
    const usage = await orderDao.unlockContent(user_id, usageData);
    successResponse(req, res, { usage, service }, 201, messages.WEB_SERVICE_CREATED);
  } catch (err) {
    errorResponse(req, res, 500, `${messages.ERROR_CREATING_WEB_SERVICE}: ${err.message}`);
  }
};


module.exports = {
    getAllWebServices,
    getWebServicesByUSer,
    updateWebServiceStatus,
    deleteWebService,
    createWebService
};