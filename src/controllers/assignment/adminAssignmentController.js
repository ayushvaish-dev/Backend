const { successResponse, errorResponse } = require('../../utils/apiResponse');
const messages = require('../../utils/messages');
const {createassignment, 
    fetchAllAssignment, 
    fetchAssignment, 
    fetchOverView,
    updateAssignment,
    fetchAllQuestions,
    fetchQuestion,
    updateQuestion,
    storeAssignmentQuestion,
    fetchAssignmentScores,
    fetchSubmittedAssignment,
    storeAssignmentGrades,
    fetchAssignmentSubmissionStatus,
    fetchAnalytics } = require('../../dao/assignment/adminAssignmentDao');

const {assignmentSchema, updateAssignmentSchema,  updateQuestionSchema, addQuestionSchema, GradeAssignment_schema } = require('../../validator/assignmentValidate');

const createAssignment = async(req, res)=>{
    try{
      const { error, value } = assignmentSchema.validate(req.body);
      if (error) return errorResponse(req, res, 400, error.details[0].message);

      value.module_id = req.params.moduleid;
      value.created_by = req.user.id;
      value.updated_by = req.user.id;
        
     let responsedata = await createassignment(value);
      return successResponse(req, res, responsedata, 200, "Assignment created successfully");
    }
      catch(err){
        console.log('error in creating asignment', err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);        
      }
  }

const getAllAssignment = async(req, res)=>{
    try{
        let moduleid = req.params.moduleid;
        let allAssignments = await fetchAllAssignment(moduleid);
        return successResponse(req, res , allAssignments, 200, "All assignments of this module are sent");
    }catch(err){
        console.log("Error in sending all assignments data", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);
    }
}

const viewAssignment = async(req, res)=>{
    try{
        let assignmentid = req.params.assignmentid;
        let assignment = await fetchAssignment(assignmentid);
        return successResponse(req, res, assignment, 200, "Assignment data has been sent sucessfully");
    }catch(err){
        console.log("error in fetching assignment", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);
    }
}

const viewAssignmentOverview = async(req, res)=>{
    try{
        let assignmentid = req.params.assignmentid;
        let overView = await fetchOverView(assignmentid);
        return successResponse(req, res, overView, 200, " Overview  of Assignment has been sent sucessfully");
    }catch(err){
        console.log("this is the error", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);
    }
}

const UpdateAssignmentOverview = async(req, res)=>{
    try{
        const { error, value } = updateAssignmentSchema.validate(req.body);
        if (error) return errorResponse(req, res, 400, error.details[0].message);

        let {title ,   description,  time_limit, max_score, difficulty, instructions } = value;
        let assignmentid = req.params.assignmentid;
        let updatedAssignment = await updateAssignment(assignmentid, title , description,  time_limit, max_score, difficulty, instructions);
        return successResponse(req, res, updatedAssignment, 200, "The Assignement has been updated successfully ")
    }catch(err){
        console.log("this is the error", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);
    }
}

const viewAllAssignmnetQuestions = async(req, res)=>{
    try{
        let assignmentid = req.params.assignmentid;
        let allQuestions = await fetchAllQuestions(assignmentid);
        return successResponse(req, res, allQuestions, 200, "all questions of the assignmet has been sent")
    }catch(err){
        console.log("error in fetching assignment questions", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);
    }
}

const getAssignmentQuestion = async(req, res)=>{
    try{
        let questionid = req.params.questionid;
        let question = await fetchQuestion(questionid);
        return successResponse(req, res, question, 200, "Question is sent");
    }catch(err){
        console.log("error in sending question", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);
    }
}

const updateAssignmentQuestion = async(req, res)=>{
    try{
        let questionid = req.params.questionid;

        let {error, value } = updateQuestionSchema.validate(req.body);
        if (error) return errorResponse(req, res, 400, error.details[0].message);
        let {question_text , points} = value;

        let updatedQuestion = await updateQuestion(questionid, question_text , points);
        return successResponse(req, res, updatedQuestion, 200, "The questions has been updated");
    }catch(err){
        console.log("error in updating assignment question", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);
    }
}

const addAssignmnetQuestion = async(req, res)=>{
    try{
        let assignmentid = req.params.assignmentid;
        let {error, value } = addQuestionSchema.validate(req.body);
        if (error) return errorResponse(req, res, 400, error.details[0].message);
        let {question_text , points} = value;

        let savedquestion = await storeAssignmentQuestion(assignmentid, question_text , points );
        return successResponse(req, res, savedquestion, 200, "Assignment question is added");
    }catch(err){
        console.log("error in Adding assignment question", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);
    }
}

const viewAssignmentScores = async(req, res)=>{
    try{
        let assignmentid = req.params.assignmentid;
        let assignmentSubmittedScores =  await fetchAssignmentScores(assignmentid);
        return successResponse(req, res, assignmentSubmittedScores, 200, "Assignment scores data as been sent");
    }catch(err){
        console.log("error in fetching assignment scores", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);
    }
}


const viewSumittedAssignment = async(req, res)=>{
    try{
        let assignmentSubmissionid = req.params.assignmentsubmissionid;
        let submittedAssignment = await fetchSubmittedAssignment(assignmentSubmissionid);
        return successResponse(req, res , submittedAssignment, 200, "submitted assignment data is fetched");
    }catch(err){
        console.log("error in fetching submitted assignment data", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);
    }
}

const gradeSumittedAssignment = async(req, res)=>{
    try{
        const { error, value } = GradeAssignment_schema.validate(req.body);
        if (error) return errorResponse(req, res, 400, error.details[0].message);        
        let {score , feedback} = value;
        let assignmentSubmissionid = req.params.assignmentsubmissionid;

        let storedData =  await storeAssignmentGrades(assignmentSubmissionid, score , feedback);
        return successResponse(req, res, storedData, 200, "Assignement grades are stores sucessfully" );
    }catch(err){
        console.log("error in storing assignmnet grades", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);
    }
}

const viewAssignmnetSubmissionStatus = async(req, res)=>{
    try{
        let assignmentid = req.params.assignmentid;
        let courseid = req.params.courseid;
        let AssignmentSubmissionData = await fetchAssignmentSubmissionStatus(assignmentid, courseid);
        return successResponse(req, res, AssignmentSubmissionData, 200, "assignment submission status sent")
    }catch(err){
        console.log("error in fetching assignmen submission data", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);
    }
}

const viewAssignmentAnalytics = async(req, res)=>{
    try{
        let assignmentid = req.params.assignmentid;
        let courseid = req.params.courseid;
        let analytics = await fetchAnalytics(assignmentid, courseid);
         
        return successResponse(req, res, analytics, 200, "analytics are sent");
    }catch(err){
        console.log("error in fetching analytics", err);
        return errorResponse(req, res, 500, messages.SERVER_ERROR);
    }
}


module.exports = {createAssignment, 
        getAllAssignment, 
        viewAssignment,
        viewAssignmentOverview,
        UpdateAssignmentOverview,
        viewAllAssignmnetQuestions,
        getAssignmentQuestion,
        updateAssignmentQuestion,
        addAssignmnetQuestion,
        viewAssignmentScores,
        viewSumittedAssignment,
        gradeSumittedAssignment,
        viewAssignmnetSubmissionStatus,
        viewAssignmentAnalytics
        };
  
