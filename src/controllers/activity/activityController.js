const activityDao = require('../../dao/activity/activityDao');
const { successResponse, errorResponse } = require('../../utils/apiResponse');
const messages = require('../../utils/messages');
const activityController = {
  getUserActivity: async (req, res) => {
    try {
      const userId = req.params.userId;
      const logs = await activityDao.getActivityByUser(userId);
      return successResponse(req, res, logs, messages.ACTIVITY_FETCHED);
    } catch (err) {
      return errorResponse(req, res, 500, messages.SERVER_ERROR);
    }
  },
  deleteUserActivity: async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await activityDao.deleteActivityByUser(userId);
    } catch (err) {
      console.error("Error deleting activity logs:", err);
      res.status(500)
    }
  }
};
module.exports = activityController;