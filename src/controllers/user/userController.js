
// src/controllers/User/UserController.js

const bcryptjs = require('bcryptjs');
const prisma = require('../../config/prismaClient');
const { updateUserPassword, getUserById, convertUsersOrInstructorsToAdmin , markEventAttendance, fetchAttendance} = require('../../dao/user/userDao');

// Utility imports
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const messages = require('../../utils/messages');

const updatePassword = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            return errorResponse(req, res, 400, messages.ALL_PASSWORD_FIELDS_REQUIRED);
        }

        if (newPassword.length < 8) {
            return errorResponse(req, res, 400, messages.PASSWORD_TOO_SHORT);
        }

        if (newPassword !== confirmPassword) {
            return errorResponse(req, res, 400, messages.PASSWORDS_DO_NOT_MATCH);
        }

        if (currentPassword === newPassword) {
            return errorResponse(req, res, 400, messages.SAME_AS_OLD_PASSWORD);
        }

        // Get user from DB
        const user = await getUserById(userId);
        if (!user) {
            return errorResponse(req, res, 404, messages.USER_NOT_FOUND);
        }

        if (user.auth_provider !== 'local') {
            return errorResponse(req, res, 400, messages.OAUTH_PASSWORD_CHANGE_NOT_ALLOWED);
        }

        const isMatch = await bcryptjs.compare(currentPassword, user.password);
        if (!isMatch) {
            return errorResponse(req, res, 400, messages.INCORRECT_CURRENT_PASSWORD);
        }

        const hashedPassword = await bcryptjs.hash(newPassword, 12);
        const updatedUser = await updateUserPassword(userId, hashedPassword);

        return successResponse(req, res, {
            updatedAt: updatedUser.updated_at,
        }, 200, messages.PASSWORD_CHANGED_SUCCESSFULLY);

    } catch (error) {
        next(error); // Global error handler will use ApiError
    }
};
const updateUsersToInstructor = async (req, res) => {
  try {
    const { user_ids } = req.body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return successResponse(req, res, null, 400, messages.MISSING_USER_IDS);
    }



      const updateUsers = await prisma.user_roles.updateMany({
      where: {
      user_id : { in: user_ids },
      },
      data: {
      role: 'instructor',
      },
      })

    return res.status(200).json({
      success: true,
      message: messages.USERS_UPDATED_TO_INSTRUCTOR(updateUsers),
    });

  } catch (error) {
    console.error("Error updating user roles to instructor:", error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};

const deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      return errorResponse(req, res, 404, messages.USER_NOT_FOUND);
    }

    // Delete profile picture from S3 if it exists
    if (user.image) {
      try {
        const { deleteFromS3, extractS3KeyFromUrl } = require('../../utils/s3Utils');
        const oldKey = extractS3KeyFromUrl(user.image);
        if (oldKey) {
          await deleteFromS3(oldKey);
        }
      } catch (s3Error) {
        console.log('Failed to delete profile picture from S3:', s3Error.message);
        // Continue with user deletion even if S3 deletion fails
      }
    }

    await prisma.activity_log.deleteMany({ where: { userId } });

    await prisma.users.delete({ where: { id: userId } });

    return successResponse(req, res, null, 200, messages.USER_DELETED);
  } catch (error) {
    console.error('Delete User Error:', error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};


const convertToAdmin = async (req, res) => {
  try {
    const { user_ids } = req.body;
    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return errorResponse(req, res, 400, messages.MISSING_USER_IDS);
    }
    const { count, messages: statusMessages, allAlreadyAdmins } = await convertUsersOrInstructorsToAdmin(user_ids);
    if (allAlreadyAdmins) {
      return successResponse(req, res, { count, statusMessages }, 200, messages.USER_ALREADY_ADMIN);
    }
    return successResponse(req, res, { count, statusMessages }, 200, messages.USERS_UPDATED_TO_ADMIN);
  } catch (error) {
    console.error("Error converting to admin:", error);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);
  }
};

const markAttendance = async(req, res)=>{
  try{
    const userId = req.user.id;
    const {eventid } = req.params;

    if(!userId || !eventid ){
      return errorResponse(req, res , 500, messages.INTERNAL_SERVER_ERROR);
    }

    const checkAlreadyMarked = await fetchAttendance(userId, eventid);
    if(checkAlreadyMarked){
      return errorResponse(req, res, 500, "Attendance for this event Already marked");
    }

    const markedAttendance = await markEventAttendance(userId , eventid);

    return successResponse(req, res, markedAttendance, 200, messages.ATTENDANCE_MARKED );
  }
  catch(err){
    console.log("Error in marking the attendance, ", err);
    return errorResponse(req, res, 500, messages.INTERNAL_SERVER_ERROR);    
  }
}

module.exports = { updatePassword,updateUsersToInstructor, deleteUser, convertToAdmin, markAttendance };

