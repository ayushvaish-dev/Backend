const userCourseDao = require("../../dao/user/userCourse")
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const {getAllAssignment, getAssignment,getAssignmentQuestions, saveAssignmentSubmission} = require('../../dao/assignment/userAssignmentDao');
const {assignment_submissionSchema} = require('../../validator/assignmentValidate');

const showAllAssignment = async(req, res)=>{
   try{
   let moduleid = req.params.moduleid;
   let allAssignments = await getAllAssignment(moduleid);
   return successResponse(req, res, allAssignments, 200, "All Assignment are sent successfully ");
   }
   catch(err){
      console.log("Error in getting all the assignment" , err);
      return errorResponse(req, res, 500, "Error in getting assignment"); 
   }

}
const ShowIndividualAssignment = async(req, res)=>{
   try{
   let assignmentid = req.params.assignmentid;
   let assignment = await getAssignment(assignmentid);
   return successResponse(req, res, assignment, 200, " Individual Assignment is sent");
   }
   catch(err){
      console.log("Error in getting individual assignment" , err);
      return errorResponse(req, res, 500, "server error in getting individual assignment");
   }
   
}

const showAssignmentQuestions = async(req, res)=>{
   try{
   let assignmentid = req.params.assignmentid;
   let assignmentQuestions = await getAssignmentQuestions(assignmentid);
   return successResponse(req, res , assignmentQuestions, 200, "All assignment questions are sent");
   }
   catch(err){
      console.log("Error in getting assignment questions" , err);
      return errorResponse(req, res, 500, "server error in getting assignment questions");
   }
   
}

const submitAssignment = async(req, res)=>{
     try{
        let assignmentid = req.params.assignmentid;
        let userid = req.user.id;

         const { error, value } = assignment_submissionSchema.validate(req.body);
         if (error) return errorResponse(req, res, 400, error.details[0].message);
         let {url , additional_notes} = value;

        let SubmittedAssignment = await saveAssignmentSubmission(assignmentid, userid, url ,additional_notes);

        return successResponse(req, res, SubmittedAssignment , 200, "Assignment submitted sucessfully");
     }
     catch(err){
        console.log("Error in submitting the assignment" , err);
        errorResponse(req, res, 500, "server error");
     }
}






module.exports = {showAllAssignment,ShowIndividualAssignment,showAssignmentQuestions,submitAssignment};