const userCourseDao = require("../../dao/user/userCourse")
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const messages = require("../../utils/messages");

//get userallcourse
const getMyCourses = async (req, res) => {
    try {
        const userId = req.user.id;


        if (!userId) {
            return errorResponse(req, res, 400, messages.USER_ID_REQUIRED);
        }
        const courses = await userCourseDao.getMyCourses(userId);
        return successResponse(req, res, courses, 200, messages.COURSES_RETRIEVED_SUCCESSFULLY);
    } catch (error) {
        return errorResponse(req, res, 500, `Error fetching enrolled courses: ${error.message}`);
    }
};
//get course by id

const getMyCourseById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { courseId } = req.params;
        if (!userId || !courseId) {
            return errorResponse(req, res, 400, messages.USER_ID_AND_COURSE_ID_REQUIRED);
        }
        const course = await userCourseDao.getMyCourseById(userId, courseId);
        if (!course) {
            return errorResponse(req, res, 404, messages.COURSE_NOT_FOUND_OR_NOT_ENROLLED);
        }
        return successResponse(req, res, course, 200, messages.COURSES_RETRIEVED_SUCCESSFULLY);
    } catch (error) {
        return errorResponse(req, res, 500, `Error fetching course: ${error.message}`);
    }
};


module.exports = {
    getMyCourses,
    getMyCourseById
};