const { get } = require('../../routes/auth/auth.routes');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const messages = require('../../utils/messages');
const {insertEssayData, fetchAllEssay, fetchEssay, updateEssayData, fetchOverViewDetails, fetchScores, fetchSubmissions, fetchSubmittedEssay, StoreGrades, fetchAnalytics} = require('../../dao/essay/adminEssayDao');
const { date } = require('joi');
const {essaySchema, updateEssaySchema, GradeEssay_schema} = require('../../validator/essayValidate');

const createEssay = async(req, res)=>{
    try{
    const { error, value } =  essaySchema.validate(req.body);
    if (error) return errorResponse(req, res, 400, error.details[0].message);
    
    console.log(value);
    
    value.created_by = req.user.id;
    value.updated_by = req.user.id;
    value.module_id = req.params.moduleid;

    let responsedata = await insertEssayData(value);
    return successResponse(req, res, responsedata, 200, "EssayData inserted in database successfully");
    }
     catch(err){
        console.log("error in creating essay ", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);
    }    
}


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


const viewEssay = async(req, res)=>{
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

const updateEssay = async(req, res)=>{
    try{
        const { error, value } = updateEssaySchema.validate(req.body);
        if (error) return errorResponse(req, res, 400, error.details[0].message);

        let essayid = req.params.essayid;
        let userid = req.user.id;
        let {title, description, essay_topic , time_limit, word_limit, max_points,  difficulty, instructions} = value;

       let updatedData = await updateEssayData(essayid, title, description, essay_topic , time_limit, word_limit, max_points,  difficulty, instructions, userid);
        return successResponse(req, res, updatedData, 200, "essay details are updated sucessfully")
    }
    catch(err){
        console.log("Error in updating essay data", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR );
        
    }
}


const viewEssayOverview = async(req, res)=>{
    try{
        let essayid = req.params.essayid;
        let courseid = req.params.courseid;
        let overviewData = await fetchOverViewDetails(essayid, courseid);

        return successResponse(req, res, overviewData, 200, "Overview data has been sent");
    }
    catch(err){
        console.log("Error in fetching score", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR );
    }
}


const viewScores = async(req, res)=>{
    try{
        let essayid = req.params.essayid;
        let EssayScores = await fetchScores(essayid);
        return successResponse(req, res, EssayScores, 200, "The Scores of Submission sent");
    }
    catch(err){
        console.log("error in fetching the scores of essay submission");
        return errorResponse(req, res, 500, messages.SERVER_ERROR)
    }
}


const viewSubmissionStatus = async (req , res)=>{
    try{
        let essayid = req.params.essayid;
        let courseid = req.params.courseid;
        let EssaySubmissions = await fetchSubmissions( essayid, courseid);
        return successResponse(req, res, EssaySubmissions, 200, "EssaySubmissions are sent");
    }
    catch(err){
        console.log("Error in fetching the submissions", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR)
    }
}
const viewAnalytics = async(req, res)=>{
    try{
        let essayid = req.params.essayid;
        let courseid = req.params.courseid;
        let analytics = await fetchAnalytics(essayid, courseid);
        return successResponse(req, res, analytics, 200, "analytics are sent");
    }   
    catch(err){
        console.log("Error in fetching the analytics", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR)        
    }
}

const viewSubmittedEssay = async (req, res)=>{
    try{
        let submissionid = req.params.essaysubmissionid;

        let SubmittedEssay = await fetchSubmittedEssay(submissionid);
        return successResponse(req, res, SubmittedEssay, 200, "Submitted essay is sent");
    }   
    catch(err){
        console.log("Error in fetching the submittedEssay", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR)        
    }
}
const viewAndGrade = async (req, res)=> {
    try {
        const { error, value } = GradeEssay_schema.validate(req.body);
        if (error) return errorResponse(req, res, 400, error.details[0].message);
        let {score , feedback } = value;
        let submissionid = req.params.essaysubmissionid;

        let Grades = await StoreGrades(submissionid, score, feedback);
        return successResponse(req, res, Grades, 200, "The marks are graded sucessfully");
    } catch (error) {
        console.log("error in grading the assignmet", error);
        return errorResponse(req, res, 500, messages.SERVER_ERROR )
    }
}

module.exports = {createEssay , getAllEssays, viewEssay, updateEssay, viewAnalytics, viewAndGrade, viewEssayOverview, viewScores, viewSubmissionStatus, viewSubmittedEssay };
