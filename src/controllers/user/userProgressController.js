const { successResponse, errorResponse } = require('../../utils/apiResponse');
const messages = require('../../utils/messages');
const { getUserById } = require('../../dao/user/userDao');
const { getAllCompletedCourse, getUserAllCourses , getCompletedModules, getcompletedQuizzes } = require('../../dao/user/userProgressDao');

const getUserProgress = async(req, res) => {
    try{
        const userId = req.user.id;

        const user = await getUserById(userId);
        if (!user) {
            return errorResponse(req, res, 404, messages.USER_NOT_FOUND);
        }

        const completedCourseCount = await getAllCompletedCourse(userId); 

        const allEnrolledCoursesCount = await getUserAllCourses(userId);

        const modulesCompletedCount = await getCompletedModules(userId);
        
        const quizCompletedCount = await getcompletedQuizzes(userId);

        const pendingCoursesCount = allEnrolledCoursesCount - completedCourseCount;

        return successResponse(req, res, {completedCourseCount, modulesCompletedCount, quizCompletedCount, allEnrolledCoursesCount , pendingCoursesCount}, 200, messages.USER_PROGRESS_FETCHED);
    }
    catch(err){
        console.log("Error in fetching user progress ", err);
        return errorResponse(req, res , 500, messages.INTERNAL_SERVER_ERROR);
    }
}

module.exports = { getUserProgress };