const { fetchAllEssay, fetchEssay, fetchEssayTopic , storeEssaySubmission} = require('../../dao/essay/userEssayDao');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const { essay_submissionSchema } = require('../../validator/essayValidate');
const getAllEssays = async(req, res)=>{
    try{
        let moduleid = req.params.moduleid;
        let allEssay = await fetchAllEssay(moduleid);
        return successResponse(req, res, allEssay, 200, "All essay data is sent");
    }
    catch(err){
        console.log("Error in fetching All essays data from database",err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);
    }
}
const ShowIndividualEssay = async(req, res)=>{
    try{
        let essayid = req.params.essayid;
        let essayData = await fetchEssay(essayid);
        return successResponse(req, res, essayData, 200 , "Essay data is sent sucessfully");
    }
    catch(err){
        console.log("Error in fetching essay data from database",err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR)
    }
}
const showEssayTopic = async (req, res)=>{
    try{
        let essayid = req.params.essayid;
        let essayTopic = await fetchEssayTopic(essayid);
        return successResponse(req, res, essayTopic, 200 , "Essay Topic is sent sucessfully");
    }
    catch(err){
        console.log("Error in fetching essay topic from database",err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR)
    }
}
const submitEssay = async (req, res)=>{
    try{
        let essayid = req.params.essayid;
        let userid = req.user.id;

        const { error, value } = essay_submissionSchema.validate(req.body);
        if (error) return errorResponse(req, res, 400, error.details[0].message);
        let {text, time_spent, word_count} = value;

       let storeddata = await storeEssaySubmission(essayid, text , userid, time_spent, word_count);
        return successResponse(req, res, storeddata , 200, "Essay submitted sucessfully");
     }
     catch(err){
        console.log("Error in submitting the Essay" , err);
        errorResponse(req, res, 500, "server error");
     }
}
module.exports  = {getAllEssays, ShowIndividualEssay, showEssayTopic, submitEssay };