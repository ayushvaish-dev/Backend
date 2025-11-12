const consultationDao = require("../../dao/consultation/consultationDao");
const {successResponse,errorResponse} = require('../../utils/apiResponse');
const messages = require("../../utils/messages");
const orderDao = require("../../dao/payment/orderDao");

const getAllConsultations = async(req,res)=>{
    try{
        const consultations = await consultationDao.getAllConsultations();
       successResponse(req, res, consultations, 200, messages.DATA_FETCHED_SUCCESSFULLY);
    }
    catch(err){
       errorResponse(req, res, 500, messages.ERROR_FETCHING_CONSULTATIONS);
    }
 };

 const getConsultationsByUser = async (req, res)=> {
  try{
    const { userId} = req.params;
    const consultaions = await consultationDao.getConsultationsByUser(userId);
     successResponse(req, res, consultaions, 200, "Data fetched successfully");
  }
  catch (err){
    errorResponse(req, res, 500, messages.ERROR_FETCHING_USER_CONSULTATIONS);
  }
 };

 const updateConsultationStatus = async(req,res)=> {
    try{
        const {consultationId} = req.params;
        const{status} = req.body;
        const updated = await consultationDao.updateConsultationStatus(consultationId, status);
        successResponse(req, res, updated, 200, messages.CONSULTATION_STATUS_UPDATED);
    }
    catch(err){
       errorResponse(req, res, 500, messages.ERROR_UPDATING_CONSULTATION);

    }
 };

 const deleteConsultation = async(req,res) =>{
  try{
    const {consultationId} = req.params;
    await consultationDao.deleteConsultation(consultationId);
    successResponse(req, res, null, 200, messages.CONSULTATION_DELETED);
  }
  catch(err){
    errorResponse(req, res, 500, messages.ERROR_DELETING_CONSULTATION);
  }
 };
 const createConsultation = async (req, res) => {
  try {
    const { user_id, scheduled_at, status,unlock_type, pricing_id } = req.body;

    if (!user_id || !scheduled_at || !status || !pricing_id) {
      return errorResponse(
     req,
     res,
     400,
    "Missing required fields: user_id, scheduled_at, status, pricing_id");

    }
    
    const userBalance = await orderDao.getUserBalance(user_id); 
    const pricing = await orderDao.getCreditsById(pricing_id);
      if(userBalance<pricing){
        return errorResponse(req, res, 400, "Insufficient credits to unlock this content");
       }
    const consultation = await consultationDao.createConsultation({
      user_id,
      scheduled_at: new Date(scheduled_at),
      status,
      pricing_id
    });
    await orderDao.deductCredits(user_id, pricing);
     const usageData = {credits_spent: pricing, unlock_type, unlock_id : pricing_id };
      const usage = await orderDao.unlockContent(user_id, usageData);
    successResponse(req, res, { usage, consultation }, 201, messages.CONSULTATION_CREATED);
  } catch (err) {
    errorResponse(req, res, 500, messages.ERROR_CREATING_CONSULTATION);
  }
};
 module.exports = {
    getAllConsultations,
    getConsultationsByUser,
    updateConsultationStatus,
    deleteConsultation,
    createConsultation
 };