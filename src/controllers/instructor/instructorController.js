const { successResponse, errorResponse } = require('../../utils/apiResponse');
const messages = require('../../utils/messages');
const { findUserData, getAllCompletedCourses, getUserAllCourses, getCompletedModules , getcompletedQuizzes, getTopAndLeastCourses, getCourseCount, getTotalEnrollments, fetchEventAttendance , addPrivateNote, getPrivateNoteByUserId} = require('../../dao/instructor/instructorDao');

const getUserAllData = async(req, res)=>{
    try {
    const userId = req.body.userId;
    const user = await findUserData(userId);

    if (!user) {
      return errorResponse(req, res, 404, messages.USER_NOT_FOUND);
    }

    return successResponse(req, res, user, 200, messages.PROFILE_FETCH);
  } catch (error) {
    return errorResponse(req, res, 500, `Error fetching user profile: ${error.message}`);
  }
};



const getUserProgressData = async(req, res)=>{
  try{
    const userId = req.body.userId;

    const completedCourses = await getAllCompletedCourses(userId); 
    const completedCoursesCount = completedCourses.length;

    const allEnrolledCourses = await getUserAllCourses(userId);
    const allEnrolledCoursesCount = allEnrolledCourses.length;


    const modulesCompleted = await getCompletedModules(userId);
    const modulesCompletedCount = modulesCompleted.length;
    
    const quizData = await getcompletedQuizzes(userId);
    const completedQuizzes = quizData.completedQuizzes;
    const completedQuizzesCount = quizData.totalCompletedQuizzes;

    const pendingCourse = allEnrolledCourses.filter((enrolledcourse)=>{
      const isCoursePending = completedCourses.every( completedcourse => enrolledcourse.course_id != completedcourse.course_id );
        
        return isCoursePending == true;
    })

    const pendingCourseCount = pendingCourse.length;

    const userProgressData = {completedCourses, completedCoursesCount,  allEnrolledCourses, allEnrolledCoursesCount, modulesCompleted, modulesCompletedCount , completedQuizzes, completedQuizzesCount, pendingCourse, pendingCourseCount};

    return successResponse(req, res, userProgressData, 200, messages.USER_PROGRESS_FETCHED);
  }catch(err){
    console.log("error in fetching user progress data", err);
    return errorResponse(req, res , 500, messages.INTERNAL_SERVER_ERROR);
  }
}

const getCourseAnalytics = async(req, res)=>{
  try{
    const TopAndLeastActiveCourses = await getTopAndLeastCourses();

    return successResponse(req, res , TopAndLeastActiveCourses, 200, messages.COURSES_FETCHED_SUCCESSFULLY);
  }
  catch(err){
    console.log("error in fetching course analytics", err);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
}

const getCourseAndEnrollments = async(req, res)=>{
  try{
    const CourseCount = await getCourseCount();
    const TotalEnrollments = await getTotalEnrollments();

    return successResponse(req, res, {CourseCount, TotalEnrollments }, 200, messages.TOTAL_COURSE_COUNT);
  }catch(err){
    console.log("Error in fetching all courses and all enrollments ", err);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR );
  }
}


const getEventAttendance = async(req, res )=>{
  try{
    const eventid = req.params.eventid;

    if(!eventid){
      return errorResponse(req, res, 500, "eventid is not defined");
    }

    const eventAttendaceList = await fetchEventAttendance(eventid);
    const TotalPresent = eventAttendaceList.length;
    return successResponse(req, res, {eventAttendaceList, TotalPresent} , 200, messages.ATTENDANCE_FETCHED);

  }catch(err){
    console.log("Error in fetching attendace of the event", err);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
}


const createPrivateNote = async(req, res)=>{
  try{
    let {private_note} = req.body;
    let userid = req.params.userid;

    if(!userid){
      return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
    }

    const createdPrivateNote = await addPrivateNote(private_note, userid);

    return successResponse(req, res, createdPrivateNote, 200, messages.CREATED_PRIVATE_NOTE );

  }catch(err){
    console.log("error in create a private note for this user ", err);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
}

const getPrivateNote = async (req, res) => {
  try {
    const userId = req.params.userid;

    if (!userId) {
      return errorResponse(req, res, 400, messages.USER_ID_REQUIRED || 'User ID is required');
    }

    const result = await getPrivateNoteByUserId(userId);

    if (!result) {
      return errorResponse(req, res, 404, messages.USER_NOT_FOUND);
    }

    return successResponse(req, res, result, 200, messages.DATA_FETCHED_SUCCESSFULLY || 'Private note fetched');
  } catch (err) {
    console.log('error in fetching private note for this user ', err);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
}


module.exports = {
    getUserAllData,
    getUserProgressData,
    getCourseAnalytics,
    getCourseAndEnrollments,
    getEventAttendance,
    createPrivateNote,
    getPrivateNote,
};